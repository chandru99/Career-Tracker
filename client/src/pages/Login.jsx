export default function Login() {
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
          padding: '48px 40px',
          width: '100%',
          maxWidth: 400,
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <div
          className="flex items-center justify-center mx-auto mb-6"
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: '#eff6ff',
          }}
        >
          <svg style={{ width: 26, height: 26, color: '#0066cc' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 600, color: '#0a0a0a', marginBottom: 6 }}>Career Tracker</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: 32 }}>Your job search, organized</p>

        <a
          href="/auth/google"
          className="flex items-center justify-center gap-3 w-full transition-all"
          style={{
            padding: '11px 20px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            textDecoration: 'none',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,102,204,0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <svg style={{ width: 18, height: 18, flexShrink: 0 }} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </a>

        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: 24 }}>
          Connects to your Google Sheets and Gmail
        </p>
      </div>
    </div>
  )
}
