"""Score PhD listings against Salman's profile."""

import json
import logging
import math
import re
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

PROFILE_PATH = Path(__file__).parent.parent / "profile" / "salman_profile.json"


def _load_profile() -> dict:
    with open(PROFILE_PATH) as f:
        return json.load(f)


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def _keyword_score(text: str, keywords: dict[str, list[str]]) -> tuple[float, dict]:
    """Return weighted keyword hit score and breakdown."""
    tokens = _tokenize(text)
    weights = {"high": 10, "medium": 5, "low": 2}
    breakdown: dict[str, list[str]] = {"high": [], "medium": [], "low": []}
    total = 0.0

    for tier, kws in keywords.items():
        for kw in kws:
            kw_tokens = _tokenize(kw)
            if kw_tokens.issubset(tokens):
                breakdown[tier].append(kw)
                total += weights[tier]

    return total, breakdown


def _funding_score(phd: dict) -> float:
    """Bonus if explicitly funded and non-EU eligible."""
    score = 0.0
    if phd.get("is_funded"):
        score += 15
    if phd.get("is_non_eu_eligible"):
        score += 10
    # Check funding text for strong signals
    ft = (phd.get("funding_text", "") + " " + phd.get("description", "")).lower()
    if any(k in ft for k in ["full funding", "fully funded", "stipend", "scholarship"]):
        score += 10
    return score


def _deadline_score(phd: dict) -> float:
    """Slight bonus for deadlines far enough out for a strong application."""
    from datetime import datetime

    dl = phd.get("deadline", "")
    if not dl:
        return 5  # unknown → neutral bonus
    # Try to extract a date
    match = re.search(r"(\d{1,2})[/ ](\w+)[/ ](\d{4})", dl)
    if match:
        try:
            d = datetime.strptime(match.group(0), "%d %B %Y")
            days_left = (d - datetime.now()).days
            if days_left > 60:
                return 5
            if days_left > 30:
                return 3
        except ValueError:
            pass
    return 2


def score_phd(phd: dict, profile: dict | None = None) -> dict[str, Any]:
    """Score a single PhD entry. Returns updated phd dict with score fields."""
    if profile is None:
        profile = _load_profile()

    keywords = profile.get("scoring_keywords", {})
    combined_text = " ".join(filter(None, [
        phd.get("title", ""),
        phd.get("description", ""),
        phd.get("full_description", ""),
        " ".join(phd.get("tags", [])),
    ]))

    kw_score, breakdown = _keyword_score(combined_text, keywords)
    fund_score = _funding_score(phd)
    deadline_score = _deadline_score(phd)

    # Normalise keyword score to 0-60 range (cap at 60)
    kw_normalised = min(kw_score, 60)
    total = kw_normalised + fund_score + deadline_score  # max ~100

    phd = dict(phd)
    phd["score"] = round(total, 1)
    phd["score_breakdown"] = {
        "keyword_hits": breakdown,
        "keyword_raw": kw_score,
        "funding_bonus": fund_score,
        "deadline_bonus": deadline_score,
    }
    return phd


def score_all(phds: list[dict], profile: dict | None = None) -> list[dict]:
    """Score and sort all PhDs, highest first."""
    if profile is None:
        profile = _load_profile()

    scored = [score_phd(p, profile) for p in phds]
    scored.sort(key=lambda p: p["score"], reverse=True)
    log.info("Scored %d PhDs. Top score: %.1f", len(scored), scored[0]["score"] if scored else 0)
    return scored


def filter_worth_emailing(phds: list[dict], min_score: float = 20.0) -> list[dict]:
    """Return PhDs scoring above threshold that haven't been emailed yet."""
    return [
        p for p in phds
        if p["score"] >= min_score and not p.get("email_sent")
        and p.get("supervisor_email")
    ]
