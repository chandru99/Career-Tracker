import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, disconnectSheet } from '../api'

export default function Navbar({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const handleLogout = async () => {
    await logout()
    onLogout()
  }

  const handleChangeSheet = async () => {
    await disconnectSheet()
    setOpen(false)
    navigate('/setup')
    window.location.reload()
  }

  return (
    <nav
      className="sticky top-0 z-30 px-8 flex items-center justify-between"
      style={{
        backgroundColor: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e5e7eb',
        height: '52px',
      }}
    >
      <button
        onClick={() => navigate('/')}
        style={{ fontSize: '16px', fontWeight: 600, color: '#0a0a0a', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        Career Tracker
      </button>

      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #d1fae5',
            color: '#065f46',
            fontSize: '12px',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
          Google Connected
        </span>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50"
          >
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#0a0a0a' }} className="hidden sm:block">
              {user?.name?.split(' ')[0]}
            </span>
            {user?.picture ? (
              <img src={user.picture} alt={user.name} style={{ width: 32, height: 32, borderRadius: '50%' }} />
            ) : (
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {initials}
              </div>
            )}
          </button>

          {open && (
            <div
              className="absolute right-0 top-full z-50"
              style={{
                marginTop: 8,
                width: 180,
                padding: 8,
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ padding: '8px 12px 8px', borderBottom: '1px solid #f3f4f6', marginBottom: 4 }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#0a0a0a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
              </div>
              <button
                onClick={handleChangeSheet}
                className="w-full text-left flex items-center gap-2 rounded-lg transition-colors hover:bg-[#f9fafb]"
                style={{ padding: '8px 12px', fontSize: '14px', color: '#374151', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <svg style={{ width: 14, height: 14, color: '#9ca3af', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Change sheet
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-2 rounded-lg transition-colors hover:bg-[#f9fafb]"
                style={{ padding: '8px 12px', fontSize: '14px', color: '#374151', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <svg style={{ width: 14, height: 14, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
