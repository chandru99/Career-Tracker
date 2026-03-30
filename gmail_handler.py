"""
Gmail handler — READ ONLY (gmail.readonly scope).

IMPORTANT: This module never writes to Gmail (no label changes, no deletions,
no marking as read). Any future Gmail write operation MUST show an on-screen
confirmation to the user before executing.
"""
import re
import base64
import logging
from pathlib import Path

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
CREDENTIALS_FILE = "credentials.json"
TOKEN_FILE = "token.json"
REDIRECT_URI = "http://localhost:8000/auth/callback"


# ── OAuth ─────────────────────────────────────────────────────────────────────

def get_auth_url() -> tuple:
    """
    Generate the Google OAuth consent URL.
    Returns (auth_url, state).
    """
    if not Path(CREDENTIALS_FILE).exists():
        raise FileNotFoundError(
            f"'{CREDENTIALS_FILE}' not found. Place it in the project root."
        )
    flow = Flow.from_client_secrets_file(
        CREDENTIALS_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return auth_url, state


def exchange_code(code: str, state: str) -> Credentials:
    """Exchange the OAuth authorisation code for credentials and save them."""
    flow = Flow.from_client_secrets_file(
        CREDENTIALS_FILE,
        scopes=SCOPES,
        state=state,
        redirect_uri=REDIRECT_URI,
    )
    flow.fetch_token(code=code)
    creds = flow.credentials
    _save_token(creds)
    return creds


def load_credentials() -> Credentials | None:
    """Load credentials from token.json, refreshing if expired."""
    token_path = Path(TOKEN_FILE)
    if not token_path.exists():
        return None
    try:
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            _save_token(creds)
        return creds if creds.valid else None
    except Exception as e:
        logger.warning(f"Could not load/refresh token: {e}")
        return None


def is_authenticated() -> bool:
    creds = load_credentials()
    return creds is not None and creds.valid


def _save_token(creds: Credentials):
    with open(TOKEN_FILE, "w") as f:
        f.write(creds.to_json())


# ── Email parsing helpers ──────────────────────────────────────────────────────

def _strip_html(html: str) -> str:
    """Remove HTML tags and collapse whitespace."""
    html = re.sub(
        r"<(script|style)[^>]*>.*?</(script|style)>",
        " ", html, flags=re.DOTALL | re.IGNORECASE,
    )
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()


def _extract_job_links(html: str) -> list:
    """
    Pull hrefs from HTML that look like job/apply links.
    Returns up to 5 unique URLs, most relevant first.
    """
    hrefs = re.findall(r'href=["\']([^"\']{10,})["\']', html)
    seen = set()
    results = []
    for link in hrefs:
        if link in seen or not link.startswith("http"):
            continue
        lower = link.lower()
        if any(kw in lower for kw in [
            "apply", "job", "career", "position", "linkedin.com/jobs",
            "greenhouse", "lever", "workday", "taleo", "jobvite", "smartrecruiters",
        ]):
            seen.add(link)
            results.append(link)
            if len(results) == 5:
                break
    return results


def _decode_payload(payload: dict) -> tuple:
    """
    Recursively decode MIME payload.
    Returns (plain_text, job_links_list).
    """
    text = ""
    links = []

    if "parts" in payload:
        for part in payload["parts"]:
            t, l = _decode_payload(part)
            text += t
            links += l
    else:
        mime = payload.get("mimeType", "")
        data = payload.get("body", {}).get("data", "")
        if data:
            raw = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")
            if mime == "text/html":
                links += _extract_job_links(raw)
                text += _strip_html(raw)
            elif mime == "text/plain":
                text += raw

    return text, links


# ── Public fetch function ──────────────────────────────────────────────────────

def fetch_job_emails(max_results: int = 20) -> list:
    """
    Search Gmail for job alert / job opportunity emails (READ ONLY).
    Returns a list of dicts:
      { message_id, subject, sender, body (≤3000 chars), links, snippet }

    This function does NOT modify any emails or labels.
    """
    creds = load_credentials()
    if not creds:
        raise RuntimeError("Gmail not authenticated. Connect Gmail first.")

    service = build("gmail", "v1", credentials=creds, cache_discovery=False)

    # Broad query covering LinkedIn alerts and direct company emails
    query = (
        '(subject:("job alert" OR "new job" OR "job opportunity" OR "job opening" '
        'OR "apply now" OR "you might be interested" OR "recommended jobs" '
        'OR "jobs for you" OR "new jobs matching") '
        'OR from:(jobs-listings@linkedin.com OR jobalerts@linkedin.com '
        'OR alerts@linkedin.com OR inmail@linkedin.com '
        'OR alert@indeed.com OR no-reply@glassdoor.com)) '
        'newer_than:30d'
    )

    result = service.users().messages().list(
        userId="me",
        q=query,
        maxResults=max_results,
    ).execute()

    messages = result.get("messages", [])
    emails = []

    for msg_ref in messages:
        try:
            msg = service.users().messages().get(
                userId="me",
                id=msg_ref["id"],
                format="full",
            ).execute()

            headers = {
                h["name"]: h["value"]
                for h in msg.get("payload", {}).get("headers", [])
            }
            body, links = _decode_payload(msg.get("payload", {}))

            emails.append({
                "message_id": msg["id"],
                "subject":    headers.get("Subject", ""),
                "sender":     headers.get("From", ""),
                "body":       body[:3000],
                "links":      links,
                "snippet":    msg.get("snippet", ""),
            })
        except Exception as e:
            logger.warning(f"Skipping message {msg_ref['id']}: {e}")

    logger.info(f"Fetched {len(emails)} job emails from Gmail.")
    return emails
