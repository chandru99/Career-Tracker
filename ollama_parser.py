import os
import json
import re
import logging
from pathlib import Path

import ollama

logger = logging.getLogger(__name__)

MODEL = os.getenv("OLLAMA_MODEL", "mistral")
PROMPT_FILE = Path("prompts/job_parser.txt")


# ── Status check ──────────────────────────────────────────────────────────────

def check_status() -> dict:
    """
    Returns { running: bool, has_mistral: bool, models: list }.
    Safe to call even when Ollama is not running.
    """
    try:
        response = ollama.list()
        # Handle both old (dict) and new (object) ollama SDK response shapes
        if hasattr(response, "models"):
            model_names = [m.model for m in response.models]
        else:
            model_names = [m.get("name", "") for m in response.get("models", [])]

        has_model = any(MODEL in name for name in model_names)
        return {"running": True, "has_mistral": has_model, "models": model_names}
    except Exception as e:
        return {"running": False, "has_mistral": False, "models": [], "error": str(e)}


# ── Prompt loading ─────────────────────────────────────────────────────────────

def _load_prompt() -> str:
    if PROMPT_FILE.exists():
        return PROMPT_FILE.read_text(encoding="utf-8")
    # Inline fallback so the app works even if the prompts folder is missing
    return (
        "Extract job listings from the email below. "
        "Return ONLY a JSON array with fields: company, position, location, "
        "apply_link, industry, source. Return [] if no jobs found.\n\n"
        "Email From: {sender}\nSubject: {subject}\n"
        "Links: {links}\nBody:\n{body}"
    )


# ── JSON extraction ───────────────────────────────────────────────────────────

def _extract_json(text: str) -> list:
    """
    Try several strategies to pull a JSON array out of the LLM response.
    Returns a list (possibly empty) — never raises.
    """
    text = text.strip()

    # 1. Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    # 2. Direct parse
    try:
        result = json.loads(text)
        return result if isinstance(result, list) else [result]
    except json.JSONDecodeError:
        pass

    # 3. Find first [...] block
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        try:
            result = json.loads(match.group())
            return result if isinstance(result, list) else [result]
        except json.JSONDecodeError:
            pass

    # 4. Find first {...} block and wrap as single-item list
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return [json.loads(match.group())]
        except json.JSONDecodeError:
            pass

    logger.warning("Could not extract JSON from LLM response.")
    return []


# ── Main parse function ───────────────────────────────────────────────────────

def parse_email(email: dict) -> list:
    """
    Send one email to Ollama/Mistral and return a list of parsed job dicts.
    Each dict has: company, position, location, apply_link, industry, source.

    Raises RuntimeError if Ollama call fails entirely.
    Returns [] if the email contains no parseable jobs.
    """
    prompt = _load_prompt().format(
        sender=email.get("sender", ""),
        subject=email.get("subject", ""),
        links=", ".join(email.get("links", [])) or "none",
        body=email.get("body", "")[:2500],
    )

    try:
        response = ollama.chat(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.1},
        )
        # Handle both attribute-style and dict-style SDK responses
        if hasattr(response, "message"):
            raw = response.message.content
        else:
            raw = response["message"]["content"]

    except Exception as e:
        raise RuntimeError(f"Ollama call failed: {e}")

    jobs = _extract_json(raw)

    # Validate and clean each entry
    cleaned = []
    for job in jobs:
        if not isinstance(job, dict):
            continue
        company  = str(job.get("company", "")).strip()
        position = str(job.get("position", "")).strip()
        if not company or not position:
            continue  # Skip entries with no company or title
        cleaned.append({
            "company":    company,
            "position":   position,
            "location":   str(job.get("location", "")).strip(),
            "apply_link": str(job.get("apply_link", "")).strip(),
            "industry":   str(job.get("industry", "")).strip(),
            "source":     str(job.get("source", "")).strip(),
        })

    return cleaned
