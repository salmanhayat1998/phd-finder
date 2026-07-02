"""PhD Finder — main orchestration script for the daily GitHub Actions job."""
import json
import logging
import os
import sys
from pathlib import Path
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("phd_finder")

ROOT = Path(__file__).parent.parent
DATA_PATH = ROOT / "data" / "phds.json"
FRONTEND_DATA = ROOT / "frontend" / "public" / "phds.json"


def save_json(phds: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(
            {"updated_at": datetime.utcnow().isoformat(), "phds": phds},
            f, indent=2
        )
    log.info("Saved %d PhDs to %s", len(phds), path)


def main():
    dry_run = os.environ.get("DRY_RUN", "false").lower() == "true"
    skip_email = os.environ.get("SKIP_EMAIL", "false").lower() == "true"
    skip_sheets = os.environ.get("SKIP_SHEETS", "false").lower() == "true"
    min_score = float(os.environ.get("MIN_EMAIL_SCORE", "20"))

    log.info("=== PhD Finder starting (dry_run=%s) ===", dry_run)

    # 1. Scrape
    from scraper import scrape_all, load_existing, merge_with_existing

    log.info("Step 1: Scraping FindAPhD…")
    new_phds = scrape_all(fetch_details=True)

    print("DEBUG: DATA_PATH =", DATA_PATH.resolve())
    print("DEBUG: exists =", DATA_PATH.exists())
    with open(DATA_PATH) as f:
        raw = f.read()
    parsed = json.loads(raw)
    print("DEBUG parsed type:", type(parsed))
    if isinstance(parsed, dict):
        print("DEBUG keys:", list(parsed.keys()))
        phds_val = parsed.get("phds")
        print("DEBUG phds type:", type(phds_val))
        print("DEBUG phds length:", len(phds_val) if phds_val is not None else None)
        if phds_val:
            print("DEBUG first item type:", type(phds_val[0]))
            print("DEBUG first item repr:", repr(phds_val[0])[:100])

    existing = load_existing(DATA_PATH)
    phds = merge_with_existing(new_phds, existing)

    # 2. Score
    from scorer import score_all, filter_worth_emailing

    log.info("Step 2: Scoring %d PhDs…", len(phds))
    phds = score_all(phds)

    # 3. Save data files (before emailing so frontend always has fresh data)
    save_json(phds, DATA_PATH)
    save_json(phds, FRONTEND_DATA)

    # 4. Email
    if not skip_email:
        from emailer import send_batch

        candidates = filter_worth_emailing(phds, min_score=min_score)
        log.info("Step 3: Emailing %d supervisor(s)…", len(candidates))
        if candidates:
            updated = send_batch(candidates, dry_run=dry_run)
            # Merge updated email state back into main list
            updated_map = {p["id"]: p for p in updated}
            phds = [updated_map.get(p["id"], p) for p in phds]
            # Re-save with email state
            save_json(phds, DATA_PATH)
            save_json(phds, FRONTEND_DATA)
        else:
            log.info("No new candidates to email.")
    else:
        log.info("Step 3: Email skipped (SKIP_EMAIL=true)")

    # 5. Log to Google Sheets
    if not skip_sheets:
        from sheets_logger import sync_to_sheets

        log.info("Step 4: Syncing to Google Sheets…")
        try:
            sync_to_sheets(phds)
        except Exception as exc:
            log.error("Sheets sync failed (non-fatal): %s", exc)
    else:
        log.info("Step 4: Sheets skipped (SKIP_SHEETS=true)")

    # Summary
    emailed_total = sum(1 for p in phds if p.get("email_sent"))
    top5 = phds[:5]
    log.info(
        "=== Done. Total: %d PhDs | Emailed: %d | Top scores: %s ===",
        len(phds),
        emailed_total,
        [f"{p['title'][:40]} ({p['score']})" for p in top5],
    )


if __name__ == "__main__":
    main()
