import re
import base64
import logging
from datetime import datetime, timezone
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

logger = logging.getLogger(__name__)

# Gmail search query — looks for application confirmation emails from last 6 months
APPLICATION_QUERY = (
    'subject:("application received" OR "thank you for applying" OR '
    '"we received your application" OR "application confirmation" OR '
    '"application submitted" OR "your application" OR '
    '"thanks for applying" OR "received your application") newer_than:180d'
)

# Sender name parts to strip (not part of the company name)
_NOISE = re.compile(
    r'\s*(careers?|recruiting|talent acquisition|hr|no.?reply|jobs?|'
    r'hiring|notifications?|do not reply|donotreply|noreply|apply)\s*$',
    flags=re.IGNORECASE,
)

# Patterns to extract position from subject line (tried in order)
_POSITION_PATTERNS = [
    r'for (?:the )?["\']?(.+?)["\']? (?:position|role|opportunity)',
    r'(?:applied|application) (?:for|to) ["\']?(.+?)["\']? at ',
    r': ["\']?(.+?)["\']? at ',
    r'(?:your|the) (.+?) application',
    r'application: (.+)',
]


def _build_gmail_service(access_token: str):
    creds = Credentials(token=access_token)
    return build("gmail", "v1", credentials=creds)


def _extract_company(from_header: str) -> str:
    """Extract company name from a From: header value."""
    # "Company Name <email@company.com>"
    m = re.match(r'^"?([^"<]+)"?\s*<', from_header)
    if m:
        name = _NOISE.sub('', m.group(1).strip()).strip(' ,')
        if name:
            return name
    # Fall back to domain: email@companyname.com → Companyname
    m = re.search(r'@([^.@]+)\.', from_header)
    if m:
        return m.group(1).capitalize()
    return ""


def _extract_position(subject: str) -> str:
    """Try to extract a job title from an email subject line."""
    for pattern in _POSITION_PATTERNS:
        m = re.search(pattern, subject, re.IGNORECASE)
        if m:
            pos = m.group(1).strip().strip('"\'')
            if pos and len(pos) < 120:
                return pos
    return ""


def _parse_email(msg: dict) -> dict | None:
    """Return {company, position, date_applied, status} or None if unusable."""
    headers = {h["name"].lower(): h["value"]
               for h in msg["payload"]["headers"]}

    subject = headers.get("subject", "")
    from_header = headers.get("from", "")
    ts_ms = int(msg.get("internalDate", 0))
    date_applied = datetime.fromtimestamp(
        ts_ms / 1000, tz=timezone.utc
    ).strftime("%Y-%m-%d")

    company = _extract_company(from_header)
    if not company:
        return None

    position = _extract_position(subject)

    return {
        "company": company,
        "position": position,
        "date_applied": date_applied,
        "status": "app submited",
    }


def scan_gmail_for_applications(access_token: str) -> list[dict]:
    """
    Search Gmail for job-application confirmation emails and return a list of
    parsed application dicts: [{company, position, date_applied, status}, ...].
    """
    service = _build_gmail_service(access_token)

    results = service.users().messages().list(
        userId="me",
        q=APPLICATION_QUERY,
        maxResults=100,
    ).execute()

    message_refs = results.get("messages", [])
    applications = []

    for ref in message_refs:
        try:
            msg = service.users().messages().get(
                userId="me",
                id=ref["id"],
                format="metadata",
                metadataHeaders=["Subject", "From"],
            ).execute()
            parsed = _parse_email(msg)
            if parsed:
                applications.append(parsed)
        except Exception as e:
            logger.warning(f"Skipping email {ref['id']}: {e}")

    return applications
