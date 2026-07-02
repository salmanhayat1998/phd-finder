"""FindAPhD scraper — fetches and parses PhD listings from configured URLs."""

import json
import hashlib
import re
import time
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

log = logging.getLogger(__name__)

SEARCH_URLS = [
    "https://www.findaphd.com/phds/united-kingdom/computer-science/non-eu-students/?h1M7gc11",
    "https://www.findaphd.com/phds/united-kingdom/videogames/non-eu-students/?j1M7g2zN440",
    "https://www.findaphd.com/phds/united-kingdom/cross-subject/non-eu-students/?j1M7g4tFoc11",
]

BASE_URL = "https://www.findaphd.com"


def _phd_id(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()[:12]


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _fetch_page_html(page, url: str) -> str:
    """Navigate to URL and wait for PhD cards to load."""
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        # Wait for at least one PhD result card
        page.wait_for_selector(".phd-result__body, .ResultCard, [class*='result']", timeout=15_000)
        time.sleep(2)  # brief settle for dynamic content
        return page.content()
    except PlaywrightTimeout:
        log.warning("Timeout waiting for results on %s — returning raw HTML", url)
        return page.content()


def _parse_listings(html: str, source_url: str) -> list[dict[str, Any]]:
    """Extract PhD listings from FindAPhD search-results HTML."""
    soup = BeautifulSoup(html, "lxml")
    results = []

    # FindAPhD uses .phd-result divs; also try generic fallbacks
    cards = (
        soup.select(".phd-result")
        or soup.select("[class*='ResultCard']")
        or soup.select("[class*='result-item']")
    )

    for card in cards:
        try:
            # Title / link
            title_el = (
                card.select_one("h3 a, h2 a, .phd-result__title a, [class*='title'] a")
            )
            if not title_el:
                continue
            title = _clean(title_el.get_text())
            href = title_el.get("href", "")
            if href and not href.startswith("http"):
                href = BASE_URL + href

            # Supervisor / department
            supervisor_el = card.select_one(
                ".phd-result__supervisor, [class*='supervisor'], .supervisor"
            )
            supervisor = _clean(supervisor_el.get_text()) if supervisor_el else ""

            # Institution
            inst_el = card.select_one(
                ".phd-result__dept, [class*='institution'], [class*='university'], .institution"
            )
            institution = _clean(inst_el.get_text()) if inst_el else ""

            # Funding / deadline text blocks
            funding_el = card.select_one("[class*='funding'], .funding-type")
            funding_text = _clean(funding_el.get_text()) if funding_el else ""

            deadline_el = card.select_one("[class*='deadline'], .deadline, [class*='Deadline']")
            deadline_text = _clean(deadline_el.get_text()) if deadline_el else ""

            # Full description snippet
            desc_el = card.select_one(
                ".phd-result__description, [class*='description'], p"
            )
            description = _clean(desc_el.get_text()) if desc_el else ""

            # Tags / subject labels
            tags = [_clean(t.get_text()) for t in card.select("[class*='tag'], .label, .badge")]

            # Determine funding eligibility flags
            full_text = card.get_text(" ", strip=True).lower()
            is_funded = any(k in full_text for k in ["funded", "scholarship", "stipend", "bursary"])
            is_non_eu = any(k in full_text for k in ["non-eu", "international", "overseas", "non eu"])

            phd = {
                "id": _phd_id(href or title),
                "title": title,
                "url": href,
                "supervisor": supervisor,
                "institution": institution,
                "funding_text": funding_text,
                "deadline": deadline_text,
                "description": description,
                "tags": tags,
                "is_funded": is_funded,
                "is_non_eu_eligible": is_non_eu,
                "source_url": source_url,
                "scraped_at": datetime.utcnow().isoformat(),
                "score": 0,
                "score_breakdown": {},
                "email_sent": False,
                "email_sent_at": None,
                "application_status": "found",
            }
            results.append(phd)
        except Exception as exc:
            log.warning("Failed to parse card: %s", exc)

    return results


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=20))
def _fetch_detail(page, url: str) -> dict[str, Any]:
    """Fetch supervisor email + full description from PhD detail page."""
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        page.wait_for_selector("h1, .phd-title", timeout=10_000)
        html = page.content()
        soup = BeautifulSoup(html, "lxml")

        # Supervisor contact info — FindAPhD often shows email in mailto links
        email = ""
        for a in soup.select("a[href^='mailto']"):
            email = a["href"].replace("mailto:", "").strip()
            break

        supervisor_name = ""
        for sel in [".supervisor-name", "[class*='SupervisorName']", ".contact-name"]:
            el = soup.select_one(sel)
            if el:
                supervisor_name = _clean(el.get_text())
                break

        full_desc = ""
        for sel in [".phd-description", "[class*='ProjectDescription']", "article", ".project-details"]:
            el = soup.select_one(sel)
            if el:
                full_desc = _clean(el.get_text())[:3000]
                break

        return {
            "supervisor_email": email,
            "supervisor_name": supervisor_name or None,
            "full_description": full_desc,
        }
    except Exception as exc:
        log.warning("Detail fetch failed for %s: %s", url, exc)
        return {"supervisor_email": "", "supervisor_name": None, "full_description": ""}


def scrape_all(fetch_details: bool = True) -> list[dict[str, Any]]:
    """Scrape all configured URLs and return merged, deduplicated PhD list."""
    all_phds: dict[str, dict] = {}

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
        )
        page = ctx.new_page()

        for url in SEARCH_URLS:
            log.info("Scraping: %s", url)
            try:
                html = _fetch_page_html(page, url)
                listings = _parse_listings(html, url)
                log.info("  Found %d listings", len(listings))
                for phd in listings:
                    # Deduplicate by ID (URL hash)
                    if phd["id"] not in all_phds:
                        all_phds[phd["id"]] = phd
            except Exception as exc:
                log.error("Failed scraping %s: %s", url, exc)

        if fetch_details:
            log.info("Fetching detail pages for %d PhDs…", len(all_phds))
            for i, phd in enumerate(all_phds.values()):
                if phd.get("url"):
                    detail = _fetch_detail(page, phd["url"])
                    phd.update(detail)
                    log.info("  [%d/%d] %s — email: %s", i + 1, len(all_phds),
                             phd["title"][:60], detail.get("supervisor_email") or "none")
                    time.sleep(1.5)  # polite crawl delay

        browser.close()

    return list(all_phds.values())


def load_existing(data_path: Path) -> dict[str, dict]:
    """Load previously scraped PhDs indexed by ID."""
    if data_path.exists():
        with open(data_path) as f:
            phds = json.load(f)
        return {p["id"]: p for p in phds}
    return {}


def merge_with_existing(new_phds: list[dict], existing: dict[str, dict]) -> list[dict]:
    """Merge new results with existing, preserving email/application state."""
    merged = dict(existing)
    new_count = 0
    for phd in new_phds:
        pid = phd["id"]
        if pid in merged:
            # Update scraped fields but preserve user-managed state
            preserve = {k: merged[pid][k] for k in (
                "email_sent", "email_sent_at", "application_status",
                "score", "score_breakdown", "notes"
            ) if k in merged[pid]}
            merged[pid].update(phd)
            merged[pid].update(preserve)
        else:
            merged[pid] = phd
            new_count += 1

    log.info("Merged: %d total (%d new)", len(merged), new_count)
    return list(merged.values())
