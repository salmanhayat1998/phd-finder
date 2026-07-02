"""
Local one-time script to generate Gmail OAuth token for use in GitHub Actions.

Run locally (not in CI):
  python scripts/setup_gmail_auth.py

Then copy the printed token JSON into a GitHub secret named GMAIL_TOKEN_JSON.
"""

import json
import os
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
CLIENT_SECRET_PATH = Path(__file__).parent.parent / "profile" / "gmail_client_secret.json"
TOKEN_PATH = Path(__file__).parent.parent / "profile" / "gmail_token.json"


def main():
    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CLIENT_SECRET_PATH.exists():
                print(f"ERROR: Place your Gmail OAuth client_secret.json at:\n  {CLIENT_SECRET_PATH}")
                print("\nTo get it:")
                print("1. Go to https://console.cloud.google.com/")
                print("2. Create/select a project → Enable Gmail API")
                print("3. APIs & Services → Credentials → Create OAuth 2.0 Client ID (Desktop app)")
                print("4. Download JSON → save as profile/gmail_client_secret.json")
                return

            flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET_PATH), SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_PATH, "w") as f:
            f.write(creds.to_json())

    token_json = json.loads(TOKEN_PATH.read_text())
    print("\n✓ Token generated. Copy the following into a GitHub secret named GMAIL_TOKEN_JSON:\n")
    print(json.dumps(token_json, indent=2))


if __name__ == "__main__":
    main()
