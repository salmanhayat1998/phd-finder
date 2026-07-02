"""Google Sheets logger — records PhD listings, email log, and application tracker."""

import json
import logging
import os
from datetime import datetime
from typing import Any

import gspread
from google.oauth2.service_account import Credentials

log = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
]

SHEET_PHDS = "PhDs Found"
SHEET_EMAILS = "Emails Sent"
SHEET_APPLICATIONS = "Applications"

PHD_HEADERS = [
    "ID", "Title", "Institution", "Supervisor", "Supervisor Email",
    "Score", "Funded", "Non-EU Eligible", "Deadline", "URL",
    "Application Status", "Email Sent", "Email Sent At",
    "Scraped At", "Source URL", "Description Snippet",
]

EMAIL_HEADERS = [
    "PhD ID", "Title", "Supervisor Email", "Sent At", "Status", "Notes",
]

APP_HEADERS = [
    "PhD ID", "Title", "Institution", "Status", "Deadline",
    "Supervisor Email", "URL", "Notes", "Last Updated",
]

STATUS_OPTIONS = ["found", "emailed", "replied", "applied", "interview", "offer", "rejected", "withdrawn"]


def _get_client() -> gspread.Client:
    creds_json = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not creds_json:
        raise RuntimeError("Set GOOGLE_SERVICE_ACCOUNT_JSON env var with service account credentials JSON.")
    creds_data = json.loads(creds_json)
    creds = Credentials.from_service_account_info(creds_data, scopes=SCOPES)
    return gspread.authorize(creds)


def _get_or_create_sheet(spreadsheet, title: str, headers: list[str]) -> gspread.Worksheet:
    try:
        ws = spreadsheet.worksheet(title)
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title=title, rows=1000, cols=len(headers))
        ws.append_row(headers, value_input_option="RAW")
        # Bold header row
        ws.format("1:1", {"textFormat": {"bold": True}})
    return ws


def _get_spreadsheet(client: gspread.Client) -> gspread.Spreadsheet:
    spreadsheet_id = os.environ.get("SPREADSHEET_ID")
    if spreadsheet_id:
        return client.open_by_key(spreadsheet_id)
    # Create new spreadsheet if ID not set
    ss = client.create("PhD Finder — Salman Hayat")
    ss.share("salmanhayat16@gmail.com", perm_type="user", role="writer")
    log.info("Created new spreadsheet: %s", ss.url)
    # Write the ID to stdout for the user to save
    print(f"SPREADSHEET_ID={ss.id}")
    return ss


def _phd_to_row(phd: dict) -> list:
    return [
        phd.get("id", ""),
        phd.get("title", ""),
        phd.get("institution", ""),
        phd.get("supervisor", ""),
        phd.get("supervisor_email", ""),
        phd.get("score", 0),
        "Yes" if phd.get("is_funded") else "No",
        "Yes" if phd.get("is_non_eu_eligible") else "No",
        phd.get("deadline", ""),
        phd.get("url", ""),
        phd.get("application_status", "found"),
        "Yes" if phd.get("email_sent") else "No",
        phd.get("email_sent_at", ""),
        phd.get("scraped_at", ""),
        phd.get("source_url", ""),
        (phd.get("description") or "")[:200],
    ]


def sync_to_sheets(phds: list[dict]) -> None:
    """Full sync — upsert all PhDs into the Sheets spreadsheet."""
    client = _get_client()
    ss = _get_spreadsheet(client)

    # --- PhDs Found sheet ---
    ws_phds = _get_or_create_sheet(ss, SHEET_PHDS, PHD_HEADERS)
    existing_rows = ws_phds.get_all_records()
    existing_ids = {str(r.get("ID", "")): i + 2 for i, r in enumerate(existing_rows)}  # 1-indexed, +1 header

    new_rows = []
    update_cells = []

    for phd in phds:
        row = _phd_to_row(phd)
        pid = phd.get("id", "")
        if pid in existing_ids:
            row_num = existing_ids[pid]
            cell_range = f"A{row_num}:{chr(64 + len(PHD_HEADERS))}{row_num}"
            update_cells.append({"range": cell_range, "values": [row]})
        else:
            new_rows.append(row)

    if new_rows:
        ws_phds.append_rows(new_rows, value_input_option="USER_ENTERED")
        log.info("Added %d new PhD rows to Sheets", len(new_rows))

    if update_cells:
        ws_phds.batch_update(update_cells, value_input_option="USER_ENTERED")
        log.info("Updated %d existing PhD rows", len(update_cells))

    # --- Emails Sent sheet ---
    ws_emails = _get_or_create_sheet(ss, SHEET_EMAILS, EMAIL_HEADERS)
    existing_email_records = ws_emails.get_all_records()
    emailed_ids = {str(r.get("PhD ID", "")) for r in existing_email_records}

    email_rows = []
    for phd in phds:
        if phd.get("email_sent") and phd.get("id") not in emailed_ids:
            email_rows.append([
                phd.get("id", ""),
                phd.get("title", ""),
                phd.get("supervisor_email", ""),
                phd.get("email_sent_at", ""),
                "Sent",
                "",
            ])
    if email_rows:
        ws_emails.append_rows(email_rows, value_input_option="USER_ENTERED")
        log.info("Logged %d email sends to Sheets", len(email_rows))

    # --- Applications sheet (only create rows for emailed/applied) ---
    ws_apps = _get_or_create_sheet(ss, SHEET_APPLICATIONS, APP_HEADERS)
    existing_app_records = ws_apps.get_all_records()
    app_ids = {str(r.get("PhD ID", "")) for r in existing_app_records}

    app_rows = []
    for phd in phds:
        status = phd.get("application_status", "found")
        if status in ("emailed", "applied", "interview", "offer") and phd.get("id") not in app_ids:
            app_rows.append([
                phd.get("id", ""),
                phd.get("title", ""),
                phd.get("institution", ""),
                status,
                phd.get("deadline", ""),
                phd.get("supervisor_email", ""),
                phd.get("url", ""),
                "",
                datetime.utcnow().isoformat(),
            ])
    if app_rows:
        ws_apps.append_rows(app_rows, value_input_option="USER_ENTERED")
        log.info("Added %d application rows to Sheets", len(app_rows))

    log.info("Sheets sync complete: %s", ss.url)
