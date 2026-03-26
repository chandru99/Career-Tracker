import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import SkeletonCard from '../components/SkeletonCard'
import StatusBadge from '../components/StatusBadge'
import StarRating from '../components/StarRating'

function greeting(name) {
  const h = new Date().getHours()
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  const first = name?.split(' ')[0] || ''
  return `Good ${time}, ${first}`
}

function formatDate(d) {
  if (!d) return ''
  const parsed = new Date(d)
  if (isNaN(parsed)) return d
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function getAvatarStyle(name) {
  const first = (name || 'A')[0].toUpperCase()
  const code = first.charCodeAt(0) - 65
  if (code <= 4) return 'bg-[#dbeafe] text-[#1e40af]'
  if (code <= 9) return 'bg-[#dcfce7] text-[#166534]'
  if (code <= 14) return 'bg-[#fef3c7] text-[#92400e]'
  if (code <= 19) return 'bg-[#f3e8ff] text-[#6b21a8]'
  return 'bg-[#ffe4e6] text-[#9f1239]'
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Home({ user }) {
  const { cache, getApps, getNet, getLampData, getAnalyticsData } = useAppData()
  const apps = cache.applications ?? null
  const networking = cache.networking ?? null
  const lamp = cache.lamp ?? null
  const analytics = cache.analytics ?? null
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getApps(), getNet(), getLampData(), getAnalyticsData()])
      .catch(err => console.error('Home load error:', err))
  }, [])

  const appStats = analytics ? {
    total: analytics.total,
    interview: (analytics.by_status?.interview_received || 0) + (analytics.by_status?.pre_interview || 0),
    rejected: analytics.by_status?.rejected || 0,
    rate: analytics.response_rate || 0,
  } : null

  const barData = analytics ? [
    { label: 'Applied', count: analytics.by_status?.applied || 0, color: '#0066cc' },
    { label: 'Interview', count: analytics.by_status?.interview_received || 0, color: '#b45309' },
    { label: 'Assessment', count: analytics.by_status?.pre_interview || 0, color: '#7c3aed' },
    { label: 'Rejected', count: analytics.by_status?.rejected || 0, color: '#dc2626' },
  ] : []
  const maxBar = barData.length ? Math.max(...barData.map(b => b.count), 1) : 1

  return (
    <div className="min-h-screen md:px-12 px-5 py-10" style={{ backgroundColor: '#f8f9fa' }}>
      <div>
        <h1 style={{ fontSize: '32px', fontWeight: 600, color: '#0a0a0a', lineHeight: 1.2 }}>
          {greeting(user?.name)}
        </h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: 4 }}>{getTodayLabel()}</p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Applications Tile */}
        <div
          onClick={() => navigate('/applications')}
          className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: 28,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#eff6ff', flexShrink: 0 }}
            >
              <svg style={{ width: 20, height: 20, color: '#0066cc' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#0a0a0a' }}>Applications tracker</p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: 2 }}>Summer 2026</p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f3f4f6', margin: '16px 0' }} />

          {!appStats ? <SkeletonCard lines={2} /> : (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <span style={{ backgroundColor: '#f3f4f6', color: '#374151', fontSize: '12px', fontWeight: 500, padding: '4px 12px', borderRadius: 9999 }}>
                  {appStats.total} Total
                </span>
                <span style={{ backgroundColor: '#fffbeb', color: '#b45309', fontSize: '12px', fontWeight: 500, padding: '4px 12px', borderRadius: 9999 }}>
                  {appStats.interview} Interview
                </span>
                <span style={{ backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 500, padding: '4px 12px', borderRadius: 9999 }}>
                  {appStats.rejected} Rejected
                </span>
                <span style={{ backgroundColor: '#f0fdf4', color: '#065f46', fontSize: '12px', fontWeight: 500, padding: '4px 12px', borderRadius: 9999 }}>
                  {appStats.rate}% Rate
                </span>
              </div>
              <div className="space-y-2">
                {(apps || []).slice(0, 3).map((app, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#0a0a0a' }} className="truncate flex-1 mr-3">
                      {app['Company'] || app['company'] || '—'}
                    </span>
                    <StatusBadge status={app['Status'] || app['status']} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Networking Tile */}
        <div
          onClick={() => navigate('/networking')}
          className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: 28,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#f0fdf4', flexShrink: 0 }}
            >
              <svg style={{ width: 20, height: 20, color: '#00875a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#0a0a0a' }}>Networking</p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: 2 }}>Acquaintances and leads</p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f3f4f6', margin: '16px 0' }} />

          {!networking ? <SkeletonCard lines={4} /> : networking.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>No contacts yet. Add your first!</p>
          ) : (
            <div className="space-y-3">
              {networking.slice(0, 4).map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`flex items-center justify-center flex-shrink-0 ${getAvatarStyle(c.acquaintance_name)}`}
                    style={{ width: 32, height: 32, borderRadius: '50%', fontSize: '12px', fontWeight: 600 }}>
                    {getInitials(c.acquaintance_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#0a0a0a' }} className="truncate">{c.acquaintance_name}</p>
                    <p style={{ fontSize: '11px', color: '#6b7280' }} className="truncate">{c.company_name}</p>
                  </div>
                  <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>{formatDate(c.date_contacted)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analytics Tile */}
        <div
          onClick={() => navigate('/analytics')}
          className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: 28,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#f5f3ff', flexShrink: 0 }}
            >
              <svg style={{ width: 20, height: 20, color: '#7c3aed' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#0a0a0a' }}>Analytics</p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: 2 }}>Pipeline overview</p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f3f4f6', margin: '16px 0' }} />

          {!analytics ? <SkeletonCard lines={3} /> : (
            <>
              <div className="space-y-2 mb-3">
                {barData.map(b => (
                  <div key={b.label} className="flex items-center gap-2">
                    <span style={{ fontSize: '12px', color: '#6b7280', width: 72, flexShrink: 0 }}>{b.label}</span>
                    <div style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 9999, height: 8 }}>
                      <div
                        style={{ width: `${(b.count / maxBar) * 100}%`, backgroundColor: b.color, height: 8, borderRadius: 9999, transition: 'width 0.3s' }}
                      />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#0a0a0a', width: 24, textAlign: 'right' }}>{b.count}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>
                Response rate: <span style={{ color: '#00875a', fontWeight: 600 }}>{analytics.response_rate}%</span>
              </p>
            </>
          )}
        </div>

        {/* LAMP Tile */}
        <div
          onClick={() => navigate('/lamp')}
          className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: 28,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#fffbeb', flexShrink: 0 }}
            >
              <svg style={{ width: 20, height: 20, color: '#b45309' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#0a0a0a' }}>LAMP list</p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: 2 }}>Target employers</p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f3f4f6', margin: '16px 0' }} />

          {!lamp ? <SkeletonCard lines={4} /> : lamp.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>No companies yet. Add your first!</p>
          ) : (
            <div className="space-y-2">
              {lamp.slice(0, 4).map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#0a0a0a' }} className="truncate">{c.company}</p>
                    <p style={{ fontSize: '11px', color: '#6b7280' }}>{c.industry}</p>
                  </div>
                  <StarRating value={c.motivation_score} readonly />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
