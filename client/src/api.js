const BASE = ''

export const getMe = () =>
  fetch(`${BASE}/auth/me`, { credentials: 'include' })

export const logout = () =>
  fetch(`${BASE}/auth/logout`, { credentials: 'include' })

export const connectSheet = (spreadsheetId) =>
  fetch(`${BASE}/api/setup/connect`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spreadsheet_id: spreadsheetId })
  })

export const disconnectSheet = () =>
  fetch(`${BASE}/api/setup/disconnect`, {
    method: 'POST',
    credentials: 'include',
  })

export const getApplications = () =>
  fetch(`${BASE}/api/applications`, { credentials: 'include' })

export const addApplication = (data) =>
  fetch(`${BASE}/api/applications`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

export const updateApplication = (rowIndex, data) =>
  fetch(`${BASE}/api/applications/${rowIndex}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

export const getLamp = () =>
  fetch(`${BASE}/api/lamp`, { credentials: 'include' })

export const addLamp = (data) =>
  fetch(`${BASE}/api/lamp`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

export const getNetworking = () =>
  fetch(`${BASE}/api/networking`, { credentials: 'include' })

export const addNetworking = (data) =>
  fetch(`${BASE}/api/networking`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

export const getAnalytics = () =>
  fetch(`${BASE}/api/analytics`, { credentials: 'include' })
