# Career Tracker

A personal career tracker that connects to your own Google Sheets file.
Each user logs in with their Google account — data lives entirely in their own Google Drive.

## Prerequisites

- Python 3.11+
- Node.js 18+
- `credentials.json` from Google Cloud Console (place in project root)

## Setup

```bash
# 1. Install Python dependencies
pip install -r server/requirements.txt

# 2. Install Node dependencies
cd client && npm install && cd ..

# 3. Install root concurrently
npm install

# 4. Run both servers
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Google Cloud Console (one-time setup)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → New Project
2. Enable APIs: **Google Sheets API**, **Gmail API**, **Google Drive API**, **Google People API**
3. OAuth consent screen → External → fill in app name
4. Test users: add your Gmail + any other users
5. Credentials → Create OAuth 2.0 Client ID → **Desktop app**
6. Download JSON → rename to `credentials.json` → place in project root

## Google Sheets structure

Your spreadsheet must have these exact tab names:
- `Applications Summer 2026`
- `LAMP List`
- `Networking Tracker`

## How multi-user works

Each user signs in with their own Google account and connects their own Google Sheets file.
Data is 100% separate. Nothing is stored on the server.

## Deploy (free)

| Service | Config |
|---------|--------|
| **Frontend** | Vercel — root dir: `/client` |
| **Backend** | Render — root: `/server`, start: `uvicorn main:app --host 0.0.0.0 --port 10000` |
| **Keep alive** | UptimeRobot — ping Render URL every 5 min |

After deploying:
1. Update `GOOGLE_REDIRECT_URI` in `server/.env` to your Render URL + `/auth/google/callback`
2. Add that URI to Google Cloud → Credentials → Authorized redirect URIs
3. Set `CLIENT_URL` to your Vercel URL
