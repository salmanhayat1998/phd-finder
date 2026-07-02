"""Gmail-based supervisor outreach emailer using the Gmail API."""

import base64
import json
import logging
import os
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

log = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
PROFILE_PATH = Path(__file__).parent.parent / "profile" / "salman_profile.json"
TOKEN_PATH = Path(__file__).parent.parent / "profile" / "gmail_token.json"


def _load_profile() -> dict:
    with open(PROFILE_PATH) as f:
        return json.load(f)


def _get_gmail_service():
    """Build authenticated Gmail service from env credentials."""
    creds = None

    # GitHub Actions: credentials passed as env vars
    client_secret_json = os.environ.get("GMAIL_CLIENT_SECRET_JSON")
    token_json = os.environ.get("GMAIL_TOKEN_JSON")

    if token_json:
        token_data = json.loads(token_json)
        creds = Credentials.from_authorized_user_info(token_data, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        elif client_secret_json:
            # For initial local setup only
            flow = InstalledAppFlow.from_client_config(
                json.loads(client_secret_json), SCOPES
            )
            creds = flow.run_local_server(port=0)
        else:
            raise RuntimeError(
                "No Gmail credentials. Set GMAIL_TOKEN_JSON env var "
                "or run scripts/setup_gmail_auth.py locally first."
            )

    return build("gmail", "v1", credentials=creds)


def _build_email(phd: dict, profile: dict, bio_text: str = "", cv_summary: str = "") -> str:
    """Generate a personalised supervisor outreach email."""
    tmpl = profile.get("outreach_template", {})
    supervisor_name = phd.get("supervisor_name") or "Professor"
    # Derive last name for greeting
    parts = supervisor_name.replace("Prof.", "").replace("Dr.", "").strip().split()
    greeting_name = parts[-1] if parts else supervisor_name

    title = phd.get("title", "your advertised PhD position")
    institution = phd.get("institution", "your institution")

    # Build relevance paragraph from score breakdown
    hits = phd.get("score_breakdown", {}).get("keyword_hits", {})
    all_hits = hits.get("high", []) + hits.get("medium", [])
    relevance_phrase = (
        f"The project's focus on {', '.join(all_hits[:3])} aligns directly with my "
        f"dissertation research on AI-Native NPC agents."
        if all_hits else
        "This project aligns closely with my research background in AI and game systems."
    )

    bio_paragraph = f"\n\n{bio_text.strip()}" if bio_text.strip() else ""
    cv_paragraph = f"\n\nKey experience: {cv_summary.strip()}" if cv_summary.strip() else ""

    body = f"""Dear Dr/Prof {greeting_name},

I am writing to enquire about the PhD position "{title}" at {institution}.

{tmpl.get("intro", "")}

{relevance_phrase}{bio_paragraph}{cv_paragraph}

{tmpl.get("visa_note", "")}

I would be very glad to discuss how my background fits your group's work. I have attached my CV for your review and would welcome the opportunity to arrange a brief call at your convenience.

Thank you for your time.

Kind regards,
{tmpl.get("signature", "Salman Hayat")}
"""
    return body.strip()


def send_outreach(phd: dict, dry_run: bool = False) -> bool:
    """Send a supervisor outreach email for the given PhD. Returns True on success."""
    profile = _load_profile()
    bio_text = profile.get("bio", "")
    cv_summary = ""  # CV text not stored in profile JSON by default — can be extended

    to_email = phd.get("supervisor_email", "")
    if not to_email:
        log.warning("No supervisor email for PhD: %s", phd.get("title"))
        return False

    subject = f"PhD Enquiry: {phd.get('title', 'Research Opportunity')}"
    body = _build_email(phd, profile, bio_text=bio_text, cv_summary=cv_summary)

    if dry_run:
        log.info("DRY RUN — would send to %s:\nSubject: %s\n\n%s", to_email, subject, body)
        return True

    try:
        service = _get_gmail_service()
        msg = MIMEMultipart()
        msg["To"] = to_email
        msg["From"] = profile["email"]
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        service.users().messages().send(userId="me", body={"raw": raw}).execute()
        log.info("Email sent to %s for: %s", to_email, phd.get("title"))
        return True
    except HttpError as exc:
        log.error("Gmail API error sending to %s: %s", to_email, exc)
        return False


def send_batch(phds: list[dict], dry_run: bool = False, delay_seconds: float = 5.0) -> list[dict]:
    """Send outreach emails for a list of PhDs; mark each as sent."""
    import time
    updated = []
    for phd in phds:
        success = send_outreach(phd, dry_run=dry_run)
        phd = dict(phd)
        if success:
            phd["email_sent"] = True
            phd["email_sent_at"] = datetime.utcnow().isoformat()
        updated.append(phd)
        if not dry_run:
            time.sleep(delay_seconds)
    return updated
