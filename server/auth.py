import os
import json
import tempfile
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]


def get_oauth_flow():
    from google_auth_oauthlib.flow import Flow

    creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")

    if creds_json:
        creds_dict = json.loads(creds_json)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json',
                                         delete=False) as f:
            json.dump(creds_dict, f)
            temp_path = f.name
        flow = Flow.from_client_secrets_file(
            temp_path,
            scopes=SCOPES,
            redirect_uri=os.getenv("GOOGLE_REDIRECT_URI")
        )
        os.unlink(temp_path)
    else:
        flow = Flow.from_client_secrets_file(
            "credentials.json",
            scopes=SCOPES,
            redirect_uri=os.getenv("GOOGLE_REDIRECT_URI")
        )
    return flow


def get_authorization_url():
    flow = get_oauth_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true"
    )
    return auth_url, state


def exchange_code(code: str, state: str):
    flow = get_oauth_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    return {
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token,
    }


def get_user_info(access_token: str):
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials
    creds = Credentials(token=access_token)
    service = build("oauth2", "v2", credentials=creds)
    user_info = service.userinfo().get().execute()
    return {
        "google_id": user_info["id"],
        "name": user_info["name"],
        "email": user_info["email"],
        "picture": user_info.get("picture", ""),
    }


def build_credentials(access_token: str):
    from google.oauth2.credentials import Credentials
    return Credentials(token=access_token)
