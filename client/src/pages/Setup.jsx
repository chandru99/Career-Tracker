import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { connectSheet, getDriveSheets, getMe, logout } from '../api'

function formatModified(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Setup({ onAuthError }) {
  const [sheets, setSheets] = useState(null)   // null = loading, [] = empty, [...] = list
  const [fetchError, setFetchError] = useState('')
  const [selected, setSelected] = useState(null)  // { id, name }
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await logout()
    onAuthError?.()
  }

  useEffect(() => {
    getDriveSheets()
      .then(r => {
        if (r.status === 401) { onAuthError?.(); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        if (Array.isArray(data)) setSheets(data)
        else setFetchError(data.detail || 'Could not load your spreadsheets')
      })
      .catch(() => setFetchError('Could not connect to Google Drive'))
  }, [])

  const handleConnect = async () => {
    if (!selected) return
    setConnecting(true)
    setConnectError('')
    try {
      const res = await connectSheet(selected.id)
      if (res.ok) {
        await getMe()
        navigate('/')
      } else {
        const data = await res.json()
        setConnectError(data.detail || 'Failed to connect sheet')
        setConnecting(false)
      }
    } catch {
      setConnectError('Network error. Please try again.')
      setConnecting(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#f8f9fa' }}
    >
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 20,
          padding: '36px 40px',
          width: '100%',
          maxWidth: 500,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            style={{
              width: 40, height: 40, borderRadius: 10,
              backgroundColor: '#f0fdf4',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg style={{ width: 20, height: 20, color: '#00875a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#0a0a0a', lineHeight: 1.3 }}>
              Connect your tracker sheet
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: 2 }}>
              Select a spreadsheet from your Google Drive
            </p>
          </div>
        </div>

        {/* Sheet list */}
        {sheets === null && !fetchError ? (
          // Loading skeleton
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  height: 56,
                  borderRadius: 10,
                  backgroundColor: '#f3f4f6',
                  width: i === 3 ? '80%' : '100%',
                }}
              />
            ))}
          </div>
        ) : fetchError ? (
          <div
            style={{
              fontSize: '13px', color: '#dc2626',
              backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '12px 14px',
            }}
          >
            {fetchError}
          </div>
        ) : sheets.length === 0 ? (
          <div
            style={{
              textAlign: 'center', padding: '32px 16px',
              color: '#9ca3af', fontSize: '14px',
              backgroundColor: '#f9fafb', borderRadius: 10,
              border: '1px solid #f3f4f6',
            }}
          >
            <svg style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p style={{ fontWeight: 500 }}>No spreadsheets found</p>
            <p style={{ fontSize: '12px', marginTop: 4 }}>Create a Google Sheet in your Drive, then refresh</p>
          </div>
        ) : (
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              overflow: 'hidden',
              maxHeight: 280,
              overflowY: 'auto',
            }}
          >
            {sheets.map((sheet, i) => {
              const isSelected = selected?.id === sheet.id
              return (
                <button
                  key={sheet.id}
                  onClick={() => setSelected(sheet)}
                  className="w-full text-left flex items-center gap-3 transition-colors"
                  style={{
                    padding: '12px 14px',
                    backgroundColor: isSelected ? '#eff6ff' : 'white',
                    border: 'none',
                    borderBottom: i < sheets.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f9fafb' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'white' }}
                >
                  {/* Sheets icon */}
                  <svg style={{ width: 20, height: 20, flexShrink: 0, color: isSelected ? '#0066cc' : '#34a853' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3h5v2h-5V6zm0 4h5v2h-5v-2zm0 4h5v2h-5v-2zM7 6h3v2H7V6zm0 4h3v2H7v-2zm0 4h3v2H7v-2z"/>
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p style={{
                      fontSize: '14px', fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? '#0066cc' : '#0a0a0a',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {sheet.name}
                    </p>
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: 1 }}>
                      Modified {formatModified(sheet.modified)}
                    </p>
                  </div>
                  {isSelected && (
                    <svg style={{ width: 16, height: 16, color: '#0066cc', flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Error from connect */}
        {connectError && (
          <p style={{
            fontSize: '13px', color: '#dc2626',
            backgroundColor: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '8px 14px', marginTop: 12,
          }}>
            {connectError}
          </p>
        )}

        {/* Connect button */}
        <button
          onClick={handleConnect}
          disabled={!selected || connecting}
          className="w-full flex items-center justify-center gap-2 mt-5"
          style={{
            backgroundColor: selected ? '#0066cc' : '#e5e7eb',
            color: selected ? 'white' : '#9ca3af',
            fontWeight: 500,
            padding: '11px 16px',
            borderRadius: 8,
            fontSize: '14px',
            border: 'none',
            cursor: selected && !connecting ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.15s',
            opacity: connecting ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (selected && !connecting) e.currentTarget.style.backgroundColor = '#0052a3' }}
          onMouseLeave={e => { if (selected && !connecting) e.currentTarget.style.backgroundColor = selected ? '#0066cc' : '#e5e7eb' }}
        >
          {connecting ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Connecting...
            </>
          ) : selected ? (
            `Connect "${selected.name}"`
          ) : (
            'Select a spreadsheet above'
          )}
        </button>

        <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
          Your data stays in your own Google Drive. We never store it.
        </p>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            onClick={handleSignOut}
            style={{ background: 'none', border: 'none', fontSize: '12px', color: '#9ca3af', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
