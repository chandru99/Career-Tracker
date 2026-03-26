from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

_FORMULA_CHARS = ('=', '+', '-', '@', '\t', '\r')


def _safe_cell(value) -> str:
    """Prevent spreadsheet formula injection by prefixing dangerous leading chars."""
    if not isinstance(value, str):
        return value if value is not None else ""
    if value.startswith(_FORMULA_CHARS):
        return "'" + value
    return value


def build_sheets_service(access_token: str):
    creds = Credentials(token=access_token)
    return build("sheets", "v4", credentials=creds, cache_discovery=False)


def read_sheet(access_token: str, spreadsheet_id: str,
               sheet_name: str, skip_rows: int = 1) -> list:
    """
    Read a sheet and return list of dicts keyed by header row.
    skip_rows: number of header rows to skip before reading data.
    First non-skipped row is treated as the header.
    Filter out rows where all values are None/empty.
    """
    service = build_sheets_service(access_token)
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range=f"{sheet_name}!A:Z"
    ).execute()
    values = result.get("values", [])
    if not values or len(values) <= skip_rows:
        return []

    header = values[skip_rows - 1] if skip_rows > 0 else values[0]
    data_rows = values[skip_rows:]

    rows = []
    for i, row in enumerate(data_rows):
        padded = row + [""] * (len(header) - len(row))
        obj = {}
        for j, key in enumerate(header):
            obj[key] = padded[j] if j < len(padded) else ""
        if all(v == "" or v is None for v in obj.values()):
            continue
        obj["_row_index"] = i + skip_rows + 1  # 1-based sheet row number
        rows.append(obj)
    return rows


def read_sheet_raw(access_token: str, spreadsheet_id: str,
                   sheet_name: str, skip_rows: int = 0) -> list:
    """
    Read a sheet and return raw list of lists (no header parsing).
    skip_rows: number of leading rows to omit from the result.
    """
    service = build_sheets_service(access_token)
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range=f"{sheet_name}!A:Z"
    ).execute()
    values = result.get("values", [])
    if not values:
        return []
    return values[skip_rows:]


def append_row(access_token: str, spreadsheet_id: str,
               sheet_name: str, row_values: list) -> dict:
    """Append a single row to a sheet."""
    service = build_sheets_service(access_token)
    body = {"values": [[_safe_cell(v) for v in row_values]]}
    result = service.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id,
        range=f"{sheet_name}!A:A",
        valueInputOption="USER_ENTERED",
        insertDataOption="INSERT_ROWS",
        body=body
    ).execute()
    return result


def update_row(access_token: str, spreadsheet_id: str,
               sheet_name: str, row_index: int, row_values: list) -> dict:
    """Update a specific row by its 1-based row index."""
    service = build_sheets_service(access_token)
    range_notation = f"{sheet_name}!A{row_index}:Z{row_index}"
    body = {"values": [[_safe_cell(v) for v in row_values]]}
    result = service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=range_notation,
        valueInputOption="USER_ENTERED",
        body=body
    ).execute()
    return result
