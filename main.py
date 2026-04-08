import os
import json
import logging
from datetime import date
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse

import gmail_handler
import ollama_parser
import excel_manager

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Career Tracker")
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Single-user local app — store OAuth state in memory
_oauth_state: str | None = None


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    try:
        excel_manager.ensure_to_apply_sheet()
    except FileNotFoundError as e:
        logger.warning(str(e))
    except Exception as e:
        logger.error(f"Startup error: {e}")


# ── Page routes ───────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    try:
        jobs = excel_manager.get_to_apply_jobs()
    except Exception as e:
        logger.error(e)
        jobs = []

    ollama_ok = ollama_parser.check_status()

    return templates.TemplateResponse("dashboard.html", {
        "request":    request,
        "jobs":       jobs,
        "active":     "dashboard",
        "gmail_auth": gmail_handler.is_authenticated(),
        "ollama_ok":  ollama_ok["running"] and ollama_ok.get("has_mistral", False),
    })


@app.get("/applications", response_class=HTMLResponse)
async def applications_page(request: Request):
    try:
        apps = excel_manager.get_applications()
    except Exception as e:
        logger.error(e)
        apps = []

    return templates.TemplateResponse("applications.html", {
        "request": request,
        "apps":    apps,
        "active":  "applications",
    })


# ── Gmail OAuth ───────────────────────────────────────────────────────────────

@app.get("/auth/gmail")
async def auth_gmail():
    global _oauth_state
    try:
        auth_url, state = gmail_handler.get_auth_url()
        _oauth_state = state
        return RedirectResponse(auth_url)
    except FileNotFoundError:
        return HTMLResponse(
            "<h2>credentials.json not found</h2>"
            "<p>Place your Google OAuth credentials file in the project root and restart.</p>",
            status_code=500,
        )
    except Exception as e:
        logger.error(f"Auth start error: {e}")
        return HTMLResponse(f"<p>Error starting OAuth: {e}</p>", status_code=500)


@app.get("/auth/callback")
async def auth_callback(code: str, state: str):
    global _oauth_state
    if state != _oauth_state:
        return HTMLResponse(
            "<p>Invalid OAuth state. <a href='/auth/gmail'>Try connecting again.</a></p>",
            status_code=400,
        )
    try:
        gmail_handler.exchange_code(code, state)
        return RedirectResponse("/")
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        return RedirectResponse("/?error=auth_failed")


@app.get("/auth/logout")
async def auth_logout():
    token = Path(gmail_handler.TOKEN_FILE)
    if token.exists():
        token.unlink()
    return RedirectResponse("/")


# ── Status badges (HTMX polled on load) ──────────────────────────────────────

@app.get("/api/ollama-status", response_class=HTMLResponse)
async def api_ollama_status():
    status = ollama_parser.check_status()
    if status["running"] and status.get("has_mistral"):
        return '<span class="badge-status ok" title="Ollama running with Mistral">Ollama ✓</span>'
    if status["running"]:
        return '<span class="badge-status warn" title="Mistral model not found — run: ollama pull mistral">Ollama ⚠</span>'
    return '<span class="badge-status err" title="Start Ollama: ollama serve">Ollama ✗</span>'


@app.get("/api/gmail-status", response_class=HTMLResponse)
async def api_gmail_status():
    if gmail_handler.is_authenticated():
        return '<span class="badge-status ok">Gmail ✓</span>'
    return '<a href="/auth/gmail" class="badge-status err" title="Click to connect Gmail">Gmail: Connect</a>'


# ── Apply form modal (HTMX partial) ──────────────────────────────────────────

@app.get("/api/jobs/{message_id}/apply-form", response_class=HTMLResponse)
async def get_apply_form(message_id: str, request: Request):
    try:
        jobs = excel_manager.get_to_apply_jobs()
        job = next(
            (j for j in jobs if str(j.get("Gmail Message ID")) == message_id),
            None,
        )
        if job is None:
            return HTMLResponse("<p>Job not found — it may already be marked applied.</p>", status_code=404)

        return templates.TemplateResponse("partials/apply_modal.html", {
            "request": request,
            "job":     job,
            "today":   date.today().isoformat(),
        })
    except Exception as e:
        logger.error(f"apply-form error: {e}")
        return HTMLResponse(f"<p>Error loading form: {e}</p>", status_code=500)


# ── Mark applied ──────────────────────────────────────────────────────────────

@app.post("/api/mark-applied", response_class=HTMLResponse)
async def mark_applied(
    request:       Request,
    message_id:    str  = Form(...),
    date_applied:  str  = Form(""),
    followup_date: str  = Form(""),
    status:        str  = Form("App Submitted"),
    role:          str  = Form(""),
    cover_letter:  str  = Form("No"),
    resume_upload: str  = Form("Yes"),
    resume_form:   str  = Form("No"),
    connections:   str  = Form("NIL"),
    notes:         str  = Form(""),
):
    try:
        excel_manager.mark_applied(message_id, {
            "date_applied":  date_applied or date.today().isoformat(),
            "followup_date": followup_date,
            "status":        status,
            "role":          role,
            "cover_letter":  cover_letter,
            "resume_upload": resume_upload,
            "resume_form":   resume_form,
            "connections":   connections or "NIL",
            "notes":         notes,
        })
        # Return empty HTML — HTMX will outerHTML-swap the row away (removing it)
        response = HTMLResponse(content="")
        response.headers["HX-Trigger"] = json.dumps({
            "closeModal": True,
            "showToast":  {"type": "success", "message": "Application logged successfully!"},
        })
        return response

    except RuntimeError as e:
        # Known errors (file locked, job not found) — surface to user
        response = HTMLResponse(content="", status_code=409)
        response.headers["HX-Trigger"] = json.dumps({
            "showToast": {"type": "error", "message": str(e)},
        })
        return response
    except Exception as e:
        logger.error(f"mark-applied error: {e}")
        response = HTMLResponse(content="", status_code=500)
        response.headers["HX-Trigger"] = json.dumps({
            "showToast": {"type": "error", "message": "Unexpected error — check the console."},
        })
        return response


# ── Fetch jobs (Gmail → Ollama → Excel) ──────────────────────────────────────

@app.post("/fetch-jobs", response_class=HTMLResponse)
def fetch_jobs(request: Request):
    """
    Sync endpoint (runs in FastAPI thread pool — safe for blocking calls).
    1. Reads job emails from Gmail (READ ONLY — no Gmail writes).
    2. Parses each email with local Ollama/Mistral.
    3. De-duplicates against existing Excel data.
    4. Batch-writes new jobs to 'To Apply' sheet.
    5. Returns the updated job-rows partial for HTMX to swap in.
    """
    def _respond(jobs, toast_type, message):
        resp = templates.TemplateResponse(
            "partials/job_rows.html", {"request": request, "jobs": jobs}
        )
        resp.headers["HX-Trigger"] = json.dumps(
            {"showToast": {"type": toast_type, "message": message}}
        )
        return resp

    # Pre-flight checks
    if not gmail_handler.is_authenticated():
        jobs = _safe_get_jobs()
        return _respond(jobs, "error", "Gmail not connected. Click 'Gmail: Connect' in the header.")

    status = ollama_parser.check_status()
    if not status["running"]:
        jobs = _safe_get_jobs()
        return _respond(jobs, "error", "Ollama is not running. Start it with: ollama serve")

    if not status.get("has_mistral"):
        jobs = _safe_get_jobs()
        return _respond(jobs, "error", "Mistral model not found. Run: ollama pull mistral")

    # Fetch emails
    try:
        emails = gmail_handler.fetch_job_emails(
            max_results=int(os.getenv("MAX_EMAILS", 20))
        )
    except Exception as e:
        logger.error(f"Gmail fetch error: {e}")
        jobs = _safe_get_jobs()
        return _respond(jobs, "error", f"Gmail error: {e}")

    # Build dedup set from existing data (one workbook read)
    try:
        existing_keys = excel_manager.get_existing_job_keys()
    except Exception as e:
        jobs = _safe_get_jobs()
        return _respond(jobs, "error", f"Excel error: {e}")

    # Parse emails and collect new jobs
    new_jobs = []
    parse_errors = 0

    for email in emails:
        try:
            parsed = ollama_parser.parse_email(email)
            for job in parsed:
                key = (job["company"].lower().strip(), job["position"].lower().strip())
                if key in existing_keys:
                    continue
                job["message_id"] = email["message_id"]
                job["date_found"] = date.today().isoformat()
                new_jobs.append(job)
                existing_keys.add(key)  # Prevent intra-batch duplicates
        except Exception as e:
            logger.warning(f"Parse error for {email.get('message_id')}: {e}")
            parse_errors += 1

    # Write to Excel
    if new_jobs:
        try:
            excel_manager.add_to_apply_batch(new_jobs)
        except RuntimeError as e:
            jobs = _safe_get_jobs()
            return _respond(jobs, "error", str(e))

    msg = f"Added {len(new_jobs)} new job(s) from {len(emails)} email(s)."
    if parse_errors:
        msg += f" {parse_errors} email(s) could not be parsed."

    toast_type = "success" if new_jobs else "info"
    jobs = _safe_get_jobs()
    return _respond(jobs, toast_type, msg)


def _safe_get_jobs() -> list:
    try:
        return excel_manager.get_to_apply_jobs()
    except Exception:
        return []


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
