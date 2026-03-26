import os
import re
import logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel
from typing import Optional

from server.auth import get_authorization_url, exchange_code, get_user_info
from server.sheets import read_sheet, read_sheet_raw, append_row, update_row, build_sheets_service
from server.middleware import require_auth, require_sheet

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

CLIENT_URL = os.getenv("CLIENT_URL", "http://localhost:5173")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET"),
    max_age=7 * 24 * 60 * 60,
    https_only=False,
    same_site="lax",
    session_cookie="career_tracker_session",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CLIENT_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── AUTH ROUTES ──

@app.get("/auth/google")
async def auth_google(request: Request):
    try:
        auth_url, state = get_authorization_url()
        request.session["oauth_state"] = state
        return RedirectResponse(auth_url)
    except Exception as e:
        logger.error(f"Auth redirect error: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate OAuth flow")


@app.get("/auth/google/callback")
async def auth_google_callback(request: Request, code: str, state: str):
    try:
        tokens = exchange_code(code, state)
        user = get_user_info(tokens["access_token"])
        request.session["google_id"] = user["google_id"]
        request.session["name"] = user["name"]
        request.session["email"] = user["email"]
        request.session["picture"] = user["picture"]
        request.session["access_token"] = tokens["access_token"]
        request.session["refresh_token"] = tokens["refresh_token"]
        request.session["spreadsheet_id"] = None
        return RedirectResponse(CLIENT_URL)
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        return RedirectResponse(f"{CLIENT_URL}?error=auth_failed")


@app.get("/auth/me")
async def auth_me(request: Request):
    try:
        if not request.session.get("access_token"):
            raise HTTPException(status_code=401, detail="Not authenticated")
        return {
            "name": request.session.get("name"),
            "email": request.session.get("email"),
            "picture": request.session.get("picture"),
            "has_sheet": bool(request.session.get("spreadsheet_id")),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth me error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/auth/logout")
async def auth_logout(request: Request):
    request.session.clear()
    return {"success": True}


# ── SETUP ROUTES ──

class ConnectSheetBody(BaseModel):
    spreadsheet_id: str


@app.post("/api/setup/connect")
async def setup_connect(body: ConnectSheetBody, request: Request,
                        session: dict = Depends(require_auth)):
    try:
        raw_id = body.spreadsheet_id
        match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', raw_id)
        extracted_id = match.group(1) if match else raw_id.strip()

        access_token = session["access_token"]
        service = build_sheets_service(access_token)
        service.spreadsheets().get(spreadsheetId=extracted_id).execute()
        request.session["spreadsheet_id"] = extracted_id
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Setup connect error: {e}")
        raise HTTPException(
            status_code=400,
            detail="Could not access that spreadsheet. Make sure the URL is correct and the sheet is in your Google Drive."
        )


@app.get("/api/setup/drive-sheets")
async def setup_drive_sheets(session: dict = Depends(require_auth)):
    """Return the user's Google Sheets spreadsheets from Drive, most recently modified first."""
    try:
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials
        creds = Credentials(token=session["access_token"])
        drive = build("drive", "v3", credentials=creds)
        result = drive.files().list(
            q="mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
            orderBy="modifiedTime desc",
            pageSize=30,
            fields="files(id,name,modifiedTime)"
        ).execute()
        files = result.get("files", [])
        return [{"id": f["id"], "name": f["name"], "modified": f.get("modifiedTime", "")} for f in files]
    except Exception as e:
        logger.error(f"Drive sheets error: {e}")
        raise HTTPException(status_code=500, detail="Could not load spreadsheets from Google Drive")


@app.post("/api/setup/disconnect")
async def setup_disconnect(request: Request,
                           session: dict = Depends(require_auth)):
    request.session["spreadsheet_id"] = None
    return {"success": True}


# ── APPLICATIONS ROUTES ──

class ApplicationBody(BaseModel):
    priority: Optional[str] = ""
    status: Optional[str] = ""
    company: Optional[str] = ""
    date_applied: Optional[str] = ""
    position: Optional[str] = ""
    industry: Optional[str] = ""
    role: Optional[str] = ""
    connections: Optional[str] = ""
    location: Optional[str] = ""
    date_posted: Optional[str] = ""
    cover_letter: Optional[str] = ""
    resume_upload: Optional[str] = ""
    resume_form: Optional[str] = ""
    salary_range: Optional[str] = ""
    latest_word: Optional[str] = ""
    notes: Optional[str] = ""


@app.get("/api/applications")
async def get_applications(session: dict = Depends(require_sheet)):
    try:
        access_token = session["access_token"]
        spreadsheet_id = session["spreadsheet_id"]
        rows = read_sheet(access_token, spreadsheet_id,
                          "Applications Summer 2026", skip_rows=1)

        def sort_key(r):
            d = r.get("Date Applied", "")
            return d if d else "0000-00-00"

        rows.sort(key=sort_key, reverse=True)
        return rows
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get applications error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/applications")
async def add_application(body: ApplicationBody,
                          session: dict = Depends(require_sheet)):
    try:
        access_token = session["access_token"]
        spreadsheet_id = session["spreadsheet_id"]
        row_list = [
            body.priority, body.status, body.company, body.date_applied,
            body.position, body.industry, body.role, body.connections,
            body.location, body.date_posted, body.cover_letter,
            body.resume_upload, body.resume_form, body.salary_range,
            body.latest_word, body.notes
        ]
        append_row(access_token, spreadsheet_id,
                   "Applications Summer 2026", row_list)
        return {"success": True, "message": "Application saved to Google Sheets"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add application error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/applications/{row_index}")
async def update_application(row_index: int, body: ApplicationBody,
                              session: dict = Depends(require_sheet)):
    try:
        access_token = session["access_token"]
        spreadsheet_id = session["spreadsheet_id"]
        row_list = [
            body.priority, body.status, body.company, body.date_applied,
            body.position, body.industry, body.role, body.connections,
            body.location, body.date_posted, body.cover_letter,
            body.resume_upload, body.resume_form, body.salary_range,
            body.latest_word, body.notes
        ]
        update_row(access_token, spreadsheet_id,
                   "Applications Summer 2026", row_index, row_list)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update application error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── LAMP LIST ROUTES ──

class LampBody(BaseModel):
    company: Optional[str] = ""
    industry: Optional[str] = ""
    alumni: Optional[str] = ""
    motivation_score: Optional[str] = ""
    open_positions: Optional[str] = ""
    linkedin_alumni: Optional[str] = ""
    non_alumni_linkedin: Optional[str] = ""
    notes: Optional[str] = ""


@app.get("/api/lamp")
async def get_lamp(session: dict = Depends(require_sheet)):
    try:
        access_token = session["access_token"]
        spreadsheet_id = session["spreadsheet_id"]
        rows = read_sheet(access_token, spreadsheet_id, "LAMP List", skip_rows=1)

        result = []
        for row in rows:
            keys = list(row.keys())
            col_a = keys[0] if len(keys) > 0 else ""
            col_b = keys[1] if len(keys) > 1 else ""
            col_c = keys[2] if len(keys) > 2 else ""
            col_d = keys[3] if len(keys) > 3 else ""
            col_e = keys[4] if len(keys) > 4 else ""
            col_f = keys[5] if len(keys) > 5 else ""
            col_g = keys[6] if len(keys) > 6 else ""
            col_h = keys[7] if len(keys) > 7 else ""

            try:
                mot = int(float(row.get(col_d, 0) or 0))
            except (ValueError, TypeError):
                mot = 0

            result.append({
                "company": row.get(col_a, ""),
                "industry": row.get(col_b, ""),
                "alumni": row.get(col_c, ""),
                "motivation_score": mot,
                "open_positions": row.get(col_e, ""),
                "linkedin_alumni": row.get(col_f, ""),
                "non_alumni_linkedin": row.get(col_g, ""),
                "notes": row.get(col_h, ""),
                "_row_index": row.get("_row_index"),
            })

        result.sort(key=lambda r: r["motivation_score"], reverse=True)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get lamp error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/lamp")
async def add_lamp(body: LampBody, session: dict = Depends(require_sheet)):
    try:
        access_token = session["access_token"]
        spreadsheet_id = session["spreadsheet_id"]
        row_list = [
            body.company, body.industry, body.alumni,
            body.motivation_score, body.open_positions,
            body.linkedin_alumni, body.non_alumni_linkedin, body.notes
        ]
        append_row(access_token, spreadsheet_id, "LAMP List", row_list)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add lamp error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── NETWORKING ROUTES ──

class NetworkingBody(BaseModel):
    acquaintance_name: Optional[str] = ""
    company_name: Optional[str] = ""
    roles_interested_suggested: Optional[str] = ""
    contact: Optional[str] = ""
    date_contacted: Optional[str] = ""
    comments: Optional[str] = ""


def _safe_get(row: list, index: int) -> str:
    try:
        return row[index] if index < len(row) else ""
    except (IndexError, TypeError):
        return ""


@app.get("/api/networking")
async def get_networking(session: dict = Depends(require_sheet)):
    try:
        access_token = session["access_token"]
        spreadsheet_id = session["spreadsheet_id"]

        data_rows = read_sheet_raw(access_token, spreadsheet_id,
                                   "Networking Tracker", skip_rows=2)

        result = []
        for i, row in enumerate(data_rows):
            name = _safe_get(row, 0)
            if not name:
                continue

            leads = []
            lead_offsets = [(7, 8, 9, 10), (11, 12, 13, 14),
                            (15, 16, 17, 18), (19, 20, 21, 22)]
            for ln, lc, lci, lcm in lead_offsets:
                lead_name = _safe_get(row, ln)
                if lead_name:
                    leads.append({
                        "name": lead_name,
                        "company": _safe_get(row, lc),
                        "contact_info": _safe_get(row, lci),
                        "comments": _safe_get(row, lcm),
                    })

            result.append({
                "row_index": i + 3,  # 1-based, skip 2 header rows
                "acquaintance_name": name,
                "company_name": _safe_get(row, 1),
                "roles_interested_suggested": _safe_get(row, 2),
                "contact": _safe_get(row, 3),
                "date_contacted": _safe_get(row, 4),
                "comments": _safe_get(row, 5),
                "leads": leads,
            })

        result.sort(
            key=lambda r: r["date_contacted"] if r["date_contacted"] else "0000-00-00",
            reverse=True
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get networking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/networking")
async def add_networking(body: NetworkingBody,
                         session: dict = Depends(require_sheet)):
    try:
        access_token = session["access_token"]
        spreadsheet_id = session["spreadsheet_id"]
        row_list = [
            body.acquaintance_name, body.company_name,
            body.roles_interested_suggested, body.contact,
            body.date_contacted, body.comments,
            "", "", "", "", "", "", "", "", "",
            "", "", "", "", "", "", "", ""
        ]
        append_row(access_token, spreadsheet_id, "Networking Tracker", row_list)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add networking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── ANALYTICS ROUTE ──

@app.get("/api/analytics")
async def get_analytics(session: dict = Depends(require_sheet)):
    try:
        access_token = session["access_token"]
        spreadsheet_id = session["spreadsheet_id"]

        applications = read_sheet(access_token, spreadsheet_id,
                                  "Applications Summer 2026", skip_rows=1)

        net_data_rows = read_sheet_raw(access_token, spreadsheet_id,
                                       "Networking Tracker", skip_rows=2)
        networking = []
        for i, row in enumerate(net_data_rows):
            name = _safe_get(row, 0)
            if not name:
                continue
            lead_names = [_safe_get(row, idx) for idx in [7, 11, 15, 19]]
            has_leads = any(n for n in lead_names)
            networking.append({
                "acquaintance_name": name,
                "company_name": _safe_get(row, 1),
                "date_contacted": _safe_get(row, 4),
                "has_leads": has_leads,
            })

        total = len(applications)
        by_status = {
            "applied": 0,
            "interview_received": 0,
            "pre_interview": 0,
            "rejected": 0,
            "pending": 0,
        }
        for app in applications:
            s = (app.get("Status") or "").lower().strip()
            if s == "app submited":
                by_status["applied"] += 1
            elif s == "interview received":
                by_status["interview_received"] += 1
            elif s == "pre-interview assessment received":
                by_status["pre_interview"] += 1
            elif s == "rejected":
                by_status["rejected"] += 1
            else:
                by_status["pending"] += 1

        response_rate = 0.0
        if total > 0:
            response_rate = round(
                (by_status["interview_received"] + by_status["pre_interview"]) / total * 100, 1
            )

        industry_counts = {}
        for app in applications:
            ind = (app.get("Industry") or "").strip()
            if ind:
                industry_counts[ind] = industry_counts.get(ind, 0) + 1
        top_industries = sorted(industry_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        top_industries = [{"name": k, "count": v} for k, v in top_industries]

        role_counts = {}
        for app in applications:
            role = (app.get("Role") or "").strip()
            if role:
                role_counts[role] = role_counts.get(role, 0) + 1
        top_roles = sorted(role_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        top_roles = [{"name": k, "count": v} for k, v in top_roles]

        sorted_apps = sorted(
            applications,
            key=lambda r: r.get("Date Applied", "") or "0000-00-00",
            reverse=True
        )
        recent_applications = sorted_apps[:5]

        total_contacts = len(networking)
        contacts_with_leads = sum(1 for n in networking if n["has_leads"])

        sorted_net = sorted(
            networking,
            key=lambda r: r["date_contacted"] if r["date_contacted"] else "0000-00-00",
            reverse=True
        )
        recent_contacts = sorted_net[:5]

        return {
            "total": total,
            "by_status": by_status,
            "response_rate": response_rate,
            "top_industries": top_industries,
            "top_roles": top_roles,
            "recent_applications": recent_applications,
            "total_contacts": total_contacts,
            "contacts_with_leads": contacts_with_leads,
            "recent_contacts": recent_contacts,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
