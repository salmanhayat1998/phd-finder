# PhD Finder — Setup Guide

Automated daily PhD scraper → scorer → Gmail outreach → Google Sheets logger → GitHub Pages dashboard.

## Architecture

```
GitHub Actions (daily 08:00 UTC)
  └── scraper.py      — Playwright scrapes 3 FindAPhD URLs
  └── scorer.py       — Keyword scoring against your profile
  └── emailer.py      — Gmail API sends supervisor outreach
  └── sheets_logger.py — Logs to Google Sheets
  └── commits phds.json → triggers frontend deploy

GitHub Pages
  └── React dashboard — PhDs found, email tracker, application tracker, PS writer
```

---

## Step 1 — Enable GitHub Pages

In your repo settings:
1. Settings → Pages → Source: **GitHub Actions**
2. Save.

---

## Step 2 — Google Sheets (service account)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (e.g. `phd-finder`)
3. Enable **Google Sheets API** and **Google Drive API**
4. IAM & Admin → Service Accounts → Create service account
5. Download the JSON key
6. In GitHub repo: Settings → Secrets → Actions → add:
   - `GOOGLE_SERVICE_ACCOUNT_JSON` — paste the entire JSON key file contents

First run will print `SPREADSHEET_ID=...` — add that as another secret:
   - `SPREADSHEET_ID` — the ID from the URL of your Google Sheet

---

## Step 3 — Gmail OAuth (for email sending)

Run locally once to generate your OAuth token:

```bash
cd phd-finder
pip install -r requirements.txt

# Get OAuth client secret from Google Cloud Console:
# APIs & Services → Credentials → Create OAuth 2.0 Client ID → Desktop app
# Download and save as: phd-finder/profile/gmail_client_secret.json

python scripts/setup_gmail_auth.py
```

This opens a browser for consent. After approval it prints `GMAIL_TOKEN_JSON`.

Add to GitHub repo secrets:
- `GMAIL_TOKEN_JSON` — paste the printed JSON
- `GMAIL_CLIENT_SECRET_JSON` — paste your client_secret.json contents

---

## Step 4 — Run the workflow

- Automatic: runs daily at 08:00 UTC
- Manual: Actions tab → **PhD Finder — Daily Scrape & Email** → Run workflow
  - Tick **Dry run** to test without sending real emails

---

## Step 5 — Access the dashboard

After the first successful run, visit:
```
https://<your-username>.github.io/<repo-name>/phd-finder/
```

---

## Secrets summary

| Secret | Purpose |
|--------|---------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Sheets logging |
| `SPREADSHEET_ID` | Which spreadsheet to write to |
| `GMAIL_TOKEN_JSON` | Gmail OAuth token (send emails) |
| `GMAIL_CLIENT_SECRET_JSON` | Gmail OAuth client secret |

All secrets are optional — the scraper and scorer run without them. Missing secrets are detected automatically:
- No `GMAIL_TOKEN_JSON` → emails skipped
- No `GOOGLE_SERVICE_ACCOUNT_JSON` → Sheets sync skipped

---

## Scoring system

Scores are 0–100:

| Component | Max | Description |
|-----------|-----|-------------|
| High keywords | 60 | Game AI, NPC, LLM, Unity, autonomous agent… |
| Medium keywords | 30 | Machine learning, HCI, VR, simulation… |
| Funded bonus | +15 | Explicitly funded position |
| Non-EU eligible | +10 | International students welcome |
| Deadline bonus | +5 | Plenty of time to apply |

Score ≥ 20 with a known supervisor email → email triggered automatically.

To adjust: edit `profile/salman_profile.json` → `scoring_keywords` section.

---

## Adding more search URLs

Edit `scripts/scraper.py` → `SEARCH_URLS` list.

---

## Local development

```bash
cd phd-finder

# Python backend (scrape only, no email/sheets)
pip install -r requirements.txt
python -m playwright install chromium
DRY_RUN=true SKIP_EMAIL=true SKIP_SHEETS=true python scripts/main.py

# React frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```
