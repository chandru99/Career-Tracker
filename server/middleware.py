from fastapi import Request, HTTPException


def require_auth(request: Request):
    """Raises 401 if user is not logged in."""
    if not request.session.get("access_token"):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return request.session


def require_sheet(request: Request):
    """Raises 403 if user has no spreadsheet connected."""
    session = require_auth(request)
    if not session.get("spreadsheet_id"):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "No sheet connected",
                "redirectTo": "/setup"
            }
        )
    return session
