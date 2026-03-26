import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import SkeletonCard from '../components/SkeletonCard'
import StatCard from '../components/StatCard'

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

function MiniBar({ label, count, max, color }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span style={{ fontSize: '13px', color: '#374151', width: 112, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 9999, height: 10 }}>
        <div style={{ width: `${pct}%`, backgroundColor: color, height: 10, borderRadius: 9999, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0a0a0a', width: 24, textAlign: 'right' }}>{count}</span>
    </div>
  )
}

export default function Analytics({ onAuthError }) {
  const { getAnalyticsData } = useAppData()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getAnalyticsData()
      .then(d => { if (d !== null) { setData(d); setLoading(false) } })
      .catch(err => { if (err?.status === 401) onAuthError?.(); setLoading(false) })
  }, [])

  const statusBars = data ? [
    { label: 'Applied', count: data.by_status?.applied || 0, color: '#0066cc' },
    { label: 'Interview', count: data.by_status?.interview_received || 0, color: '#b45309' },
    { label: 'Assessment', count: data.by_status?.pre_interview || 0, color: '#7c3aed' },
    { label: 'Rejected', count: data.by_status?.rejected || 0, color: '#dc2626' },
    { label: 'Pending', count: data.by_status?.pending || 0, color: '#9ca3af' },
  ] : []
  const maxStatus = statusBars.length ? Math.max(...statusBars.map(b => b.count), 1) : 1
  const maxInd = data?.top_industries?.length ? Math.max(...data.top_industries.map(i => i.count), 1) : 1
  const maxRole = data?.top_roles?.length ? Math.max(...data.top_roles.map(r => r.count), 1) : 1

  return (
    <div className="max-w-5xl mx-auto md:px-12 px-5 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#0a0a0a' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6b7280' }}
        >
          <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0a0a0a' }}>Analytics</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SkeletonCard lines={6} />
          <SkeletonCard lines={6} />
        </div>
      ) : (
        <>
          {/* Top stat row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Applications" value={data?.total || 0} color="text-blue-600" />
            <StatCard label="Interview / Assessment" value={(data?.by_status?.interview_received || 0) + (data?.by_status?.pre_interview || 0)} color="text-amber-600" />
            <StatCard label="Rejected" value={data?.by_status?.rejected || 0} color="text-red-600" />
            <StatCard label="Response Rate" value={`${data?.response_rate || 0}%`} color="text-green-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Applications charts */}
            <div className="space-y-5">
              <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0a0a0a', marginBottom: 16, paddingLeft: 12, borderLeft: '2px solid #0066cc' }}>
                  Status breakdown
                </p>
                <div className="space-y-3">
                  {statusBars.map(b => (
                    <MiniBar key={b.label} label={b.label} count={b.count} max={maxStatus} color={b.color} />
                  ))}
                </div>
              </div>

              <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0a0a0a', marginBottom: 16, paddingLeft: 12, borderLeft: '2px solid #0066cc' }}>
                  Top 5 Industries
                </p>
                {data?.top_industries?.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {(data?.top_industries || []).map(ind => (
                      <MiniBar key={ind.name} label={ind.name} count={ind.count} max={maxInd} color="#0066cc" />
                    ))}
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0a0a0a', marginBottom: 16, paddingLeft: 12, borderLeft: '2px solid #7c3aed' }}>
                  Top 5 Roles
                </p>
                {data?.top_roles?.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {(data?.top_roles || []).map(r => (
                      <MiniBar key={r.name} label={r.name} count={r.count} max={maxRole} color="#7c3aed" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Networking */}
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4">
                <StatCard label="Total Contacts" value={data?.total_contacts || 0} color="text-teal-600" />
                <StatCard label="Contacts with Leads" value={data?.contacts_with_leads || 0} color="text-purple-600" />
                <StatCard label="Without Leads" value={(data?.total_contacts || 0) - (data?.contacts_with_leads || 0)} color="text-gray-600" />
              </div>

              <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0a0a0a', marginBottom: 16, paddingLeft: 12, borderLeft: '2px solid #00875a' }}>
                  Recent Contacts
                </p>
                {data?.recent_contacts?.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>No contacts yet</p>
                ) : (
                  <div className="space-y-3">
                    {(data?.recent_contacts || []).map((c, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`flex items-center justify-center flex-shrink-0 ${getAvatarStyle(c.acquaintance_name)}`}
                          style={{ width: 32, height: 32, borderRadius: '50%', fontSize: '12px', fontWeight: 600 }}>
                          {getInitials(c.acquaintance_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: '13px', fontWeight: 500, color: '#0a0a0a' }} className="truncate">{c.acquaintance_name}</p>
                          <p style={{ fontSize: '11px', color: '#6b7280' }} className="truncate">{c.company_name}</p>
                        </div>
                        <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>{formatDate(c.date_contacted)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0a0a0a', marginBottom: 16, paddingLeft: 12, borderLeft: '2px solid #0066cc' }}>
                  Recent Applications
                </p>
                {data?.recent_applications?.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>No applications yet</p>
                ) : (
                  <div className="space-y-3">
                    {(data?.recent_applications || []).map((a, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="min-w-0 flex-1 mr-3">
                          <p style={{ fontSize: '13px', fontWeight: 500, color: '#0a0a0a' }} className="truncate">{a['Company'] || '—'}</p>
                          <p style={{ fontSize: '11px', color: '#6b7280' }} className="truncate">{a['Position'] || ''}</p>
                        </div>
                        <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>{formatDate(a['Date Applied'])}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
