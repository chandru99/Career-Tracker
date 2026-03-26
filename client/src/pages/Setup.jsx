import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { connectSheet, getMe } from '../api'

export default function Setup() {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleConnect = async () => {
    if (!value.trim()) { setError('Please enter a spreadsheet URL or ID'); return }
    setLoading(true)
    setError('')
    try {
      const res = await connectSheet(value.trim())
      if (res.ok) {
        await getMe()
        navigate('/')
      } else {
        const data = await res.json()
        setError(data.detail || 'Failed to connect sheet')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
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
          padding: '40px',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <div
          className="flex items-center justify-center mb-5"
          style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#f0fdf4' }}
        >
          <svg style={{ width: 22, height: 22, color: '#00875a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#0a0a0a', marginBottom: 6 }}>
          Connect your tracker sheet
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: 24 }}>
          Paste the URL or ID of your Google Sheets career tracker
        </p>

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          style={{
            width: '100%',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: '14px',
            color: '#0a0a0a',
            outline: 'none',
            backgroundColor: 'white',
            marginBottom: 12,
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
          onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
        />

        {error && (
          <p style={{
            fontSize: '13px', color: '#dc2626',
            backgroundColor: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '8px 14px', marginBottom: 12,
          }}>
            {error}
          </p>
        )}

        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2"
          style={{
            backgroundColor: loading ? 'rgba(0,102,204,0.6)' : '#0066cc',
            color: 'white',
            fontWeight: 500,
            padding: '11px 16px',
            borderRadius: 8,
            fontSize: '14px',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#0052a3' }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#0066cc' }}
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Connecting...
            </>
          ) : 'Connect Sheet'}
        </button>

        <div
          style={{
            marginTop: 20,
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '14px 16px',
          }}
        >
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Expected sheet tabs
          </p>
          <ul className="space-y-1.5">
            {['Applications Summer 2026', 'LAMP List', 'Networking Tracker'].map(s => (
              <li key={s} className="flex items-center gap-2" style={{ fontSize: '13px', color: '#374151' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#00875a', flexShrink: 0, display: 'inline-block' }} />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
          Your data stays in your own Google Drive. We never store it.
        </p>
      </div>
    </div>
  )
}
