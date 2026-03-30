# Career Tracker

A local-first web app that fetches job emails from Gmail, parses them with a local Ollama LLM (Mistral), and tracks your applications in your existing Excel workbook.

## Features

- Fetch job alert emails from Gmail (read-only — no email modifications)
- Parse job details (company, title, location, apply link) using local Mistral LLM — no data leaves your machine
- De-duplicate against your existing Application Tracker history
- View jobs as a searchable table with direct apply links
- Log applications via a modal form → auto-updates your Excel workbook
- Dark-themed UI with live status indicators for Ollama and Gmail

## Project Structure

```
Career-Tracker/
├── main.py               # FastAPI app and all routes
├── gmail_handler.py      # Gmail OAuth + email fetching (read-only)
├── ollama_parser.py      # Ollama/Mistral integration
├── excel_manager.py      # Excel read/write logic
├── requirements.txt
├── .env.example          # Copy to .env and edit
├── prompts/
│   └── job_parser.txt    # LLM prompt (edit to tune parsing accuracy)
├── templates/
│   ├── base.html
│   ├── dashboard.html    # "To Apply" page
│   ├── applications.html # Application history page
│   └── partials/
│       ├── job_rows.html    # HTMX partial — job table rows
│       └── apply_modal.html # HTMX partial — "I Applied" form
└── static/
    └── style.css         # Dark theme
```

## Excel Workbook

The app reads and writes `Career Tracker.xlsx` (place it in the project root).

| Sheet | App behaviour |
|---|---|
| `Dream Company List` | Never touched |
| `Networking Tracker` | Never touched |
| `Application Tracker` | New rows appended when you mark a job Applied. A `Follow-up Date` header is added to column 16 (the first blank column) on first use. |
| `To Apply` | **Created by the app** on first run. Stores fetched jobs. |

## Gmail Permission

This app uses the `gmail.readonly` scope — it can only **read** emails. It never modifies, deletes, labels, or marks emails as read.

Any future Gmail write operation will require explicit on-screen confirmation before execution.

## Setup

### 1. Prerequisites

- Python 3.10+
- [Ollama](https://ollama.com) installed with the Mistral model:
  ```
  ollama pull mistral
  ```
- A Google Cloud project with Gmail API enabled and an OAuth Desktop App credential (`credentials.json`) — see manual steps below.

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` if your Excel file name differs from `Career Tracker.xlsx`.

### 4. Place required files in the project root

```
credentials.json   ← Downloaded from Google Cloud Console
Career Tracker.xlsx ← Your existing Excel workbook
```

### 5. Run the app

```bash
# Make sure Ollama is running first
ollama serve

# In a separate terminal
python main.py
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

### 6. Connect Gmail

Click **Gmail: Connect** in the top-right corner. This opens a Google consent screen. After authorising, you're redirected back to the app and a `token.json` is saved locally.

## Usage Workflow

1. Click **Fetch Jobs** → app reads Gmail for job alert emails → Ollama parses each one → new jobs appear in the table
2. Click **Apply ↗** on a row to open the job on LinkedIn/company site
3. After applying, return to the app and click **I Applied**
4. Fill in the form (date, status, notes, follow-up date) → click **Save & Mark Applied**
5. The row disappears from "To Apply" and a new entry is added to the `Application Tracker` sheet in your Excel file
6. Check the **Applications** tab to see your full history with status filters

## Tuning the LLM Parser

If Ollama is not parsing emails correctly, edit `prompts/job_parser.txt`. You can:
- Add more examples of the email format you receive
- Constrain the `source` field to specific values
- Adjust the instructions for extracting `apply_link`

No restart needed — the prompt is read fresh on each request.

## Security Notes

- `credentials.json` and `token.json` are gitignored — never commit them
- `Career Tracker.xlsx` is gitignored — your application data stays local
- The app binds to `127.0.0.1` only — not accessible from other machines
