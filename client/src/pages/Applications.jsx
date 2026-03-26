import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { addApplication, updateApplication, scanGmail } from '../api'
import { useAppData } from '../context/AppDataContext'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import SkeletonCard from '../components/SkeletonCard'
import StatCard from '../components/StatCard'

const STATUSES = ['app submited', 'interview received', 'Pre-Interview Assessment Received', 'rejected', '']
const STATUS_LABELS = { 'app submited': 'Applied', 'interview received': 'Interview', 'Pre-Interview Assessment Received': 'Assessment', 'rejected': 'Rejected', '': 'Pending' }

function formatDate(d) {
  if (!d) return ''
  const parsed = new Date(d)
  if (isNaN(parsed)) return d
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const EMPTY_FORM = {
  company: '', position: '', industry: '', role: '', location: '',
  status: '', date_applied: new Date().toISOString().split('T')[0],
  date_posted: '', cover_letter: '', resume_upload: '', resume_form: '',
  salary_range: '', connections: '', latest_word: '', notes: '', priority: '',
}

export default function Applications({ onAuthError }) {
  const { getApps, invalidate } = useAppData()
  const [apps, setApps] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterIndustry, setFilterIndustry] = useState('all')
  const [sortCol, setSortCol] = useState('Date Applied')
  const [sortDir, setSortDir] = useState(-1)
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const data = await getApps()
      if (data !== null) setApps(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err?.status === 401) { onAuthError?.(); return }
      setApps([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const industries = useMemo(() => {
    const s = new Set((apps || []).map(a => a['Industry'] || '').filter(Boolean))
    return [...s].sort()
  }, [apps])

  const filtered = useMemo(() => {
    if (!apps) return []
    let r = apps
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(a =>
        (a['Company'] || '').toLowerCase().includes(q) ||
        (a['Position'] || '').toLowerCase().includes(q) ||
        (a['Role'] || '').toLowerCase().includes(q)
      )
    }
    if (filterStatus !== 'all') {
      r = r.filter(a => {
        const s = (a['Status'] || '').toLowerCase()
        if (filterStatus === 'pending') return !s || !STATUSES.slice(0,-1).includes(s)
        return s === filterStatus.toLowerCase()
      })
    }
    if (filterIndustry !== 'all') r = r.filter(a => (a['Industry'] || '') === filterIndustry)

    return [...r].sort((a, b) => {
      const av = a[sortCol] || ''
      const bv = b[sortCol] || ''
      return av < bv ? -sortDir : av > bv ? sortDir : 0
    })
  }, [apps, search, filterStatus, filterIndustry, sortCol, sortDir])

  const stats = useMemo(() => {
    if (!apps) return null
    const total = apps.length
    const interview = apps.filter(a => {
      const s = (a['Status'] || '').toLowerCase()
      return s === 'interview received' || s === 'pre-interview assessment received'
    }).length
    const rejected = apps.filter(a => (a['Status'] || '').toLowerCase() === 'rejected').length
    const rate = total > 0 ? Math.round((interview / total) * 100) : 0
    return { total, interview, rejected, rate }
  }, [apps])

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => -d)
    else { setSortCol(col); setSortDir(-1) }
  }

  const handleGmailScan = async () => {
    setScanning(true)
    try {
      const res = await scanGmail()
      if (res.status === 401) { onAuthError?.(); return }
      const data = await res.json()
      if (!res.ok) { setToast({ msg: data.detail || 'Gmail scan failed', type: 'error' }); return }
      const { added_count, skipped_count, total_found } = data
      if (total_found === 0) {
        setToast({ msg: 'No application confirmation emails found in Gmail', type: 'info' })
      } else if (added_count === 0) {
        setToast({ msg: `Found ${total_found} email(s) — all already in your tracker`, type: 'info' })
      } else {
        setToast({ msg: `Added ${added_count} new application(s) from Gmail${skipped_count > 0 ? ` (${skipped_count} already existed)` : ''}`, type: 'success' })
        invalidate('applications')
        await load()
      }
    } catch {
      setToast({ msg: 'Could not connect to Gmail', type: 'error' })
    }
    setScanning(false)
  }

  const openAdd = () => { setEditRow(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (app) => {
    setEditRow(app['_row_index'])
    setForm({
      company: app['Company'] || '',
      position: app['Position'] || '',
      industry: app['Industry'] || '',
      role: app['Role'] || '',
      location: app['Location'] || '',
      status: app['Status'] || '',
      date_applied: app['Date Applied'] || '',
      date_posted: app['Date Posted'] || '',
      cover_letter: app['Cover Letter'] || '',
      resume_upload: app['Résumé upload?'] || '',
      resume_form: app['Résumé Form?'] || '',
      salary_range: app['Salary Range'] || '',
      connections: app['Connections?'] || '',
      latest_word: app['Latest word'] || '',
      notes: app['Notes'] || '',
      priority: app['Priority'] || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.company || !form.position) { setToast({ msg: 'Company and Position are required', type: 'error' }); return }
    setSaving(true)
    try {
      let res
      if (editRow) {
        res = await updateApplication(editRow, form)
      } else {
        res = await addApplication(form)
      }
      if (res.ok) {
        setShowModal(false)
        setToast({ msg: editRow ? 'Updated ✓' : 'Saved to Google Sheets ✓', type: 'success' })
        invalidate('applications')
        await load()
      } else {
        const d = await res.json()
        setToast({ msg: d.detail || 'Save failed', type: 'error' })
      }
    } catch {
      setToast({ msg: 'Network error', type: 'error' })
    }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: '14px',
    color: '#0a0a0a',
    outline: 'none',
    backgroundColor: 'white',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
  }

  const SortHeader = ({ col, label }) => (
    <th
      onClick={() => handleSort(col)}
      className="text-left cursor-pointer select-none whitespace-nowrap"
      style={{
        padding: '12px 16px',
        fontSize: '11px',
        fontWeight: 600,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        backgroundColor: '#f9fafb',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = '#0a0a0a' }}
      onMouseLeave={e => { e.currentTarget.style.color = '#6b7280' }}
    >
      {label} {sortCol === col ? (sortDir === -1 ? '↓' : '↑') : ''}
    </th>
  )

  return (
    <div className="max-w-7xl mx-auto md:px-12 px-5 py-8">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', transition: 'color 0.15s', padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#0a0a0a' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6b7280' }}
        >
          <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0a0a0a', flex: 1 }}>Applications Summer 2026</h1>
        <button
          onClick={handleGmailScan}
          disabled={scanning}
          style={{
            backgroundColor: scanning ? '#f3f4f6' : 'white',
            color: '#374151',
            fontSize: '14px',
            fontWeight: 500,
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            cursor: scanning ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            opacity: scanning ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!scanning) e.currentTarget.style.backgroundColor = '#f9fafb' }}
          onMouseLeave={e => { if (!scanning) e.currentTarget.style.backgroundColor = 'white' }}
        >
          {scanning ? (
            <svg className="animate-spin" style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg style={{ width: 15, height: 15 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
          {scanning ? 'Scanning...' : 'Scan Gmail'}
        </button>
        <button
          onClick={openAdd}
          style={{
            backgroundColor: '#0066cc',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0052a3' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0066cc' }}
        >
          + Add Application
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total" value={stats.total} color="text-blue-600" />
          <StatCard label="Interview / Assessment" value={stats.interview} color="text-amber-600" />
          <StatCard label="Rejected" value={stats.rejected} color="text-red-600" />
          <StatCard label="Response Rate" value={`${stats.rate}%`} color="text-green-600" />
        </div>
      )}

      <div
        className="flex flex-wrap gap-3 mb-5"
        style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div className="relative flex-1 min-w-48">
          <svg
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company, role..."
            style={{
              ...inputStyle,
              paddingLeft: 36,
              paddingRight: 12,
              paddingTop: 8,
              paddingBottom: 8,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: '14px',
            color: '#374151',
            backgroundColor: 'white',
            outline: 'none',
            cursor: 'pointer',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#0066cc' }}
          onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb' }}
        >
          <option value="all">All Statuses</option>
          <option value="app submited">Applied</option>
          <option value="interview received">Interview</option>
          <option value="pre-interview assessment received">Assessment</option>
          <option value="rejected">Rejected</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={filterIndustry}
          onChange={e => setFilterIndustry(e.target.value)}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: '14px',
            color: '#374151',
            backgroundColor: 'white',
            outline: 'none',
            cursor: 'pointer',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#0066cc' }}
          onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb' }}
        >
          <option value="all">All Industries</option>
          {industries.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        {(search || filterStatus !== 'all' || filterIndustry !== 'all') && (
          <button
            onClick={() => { setSearch(''); setFilterStatus('all'); setFilterIndustry('all') }}
            style={{
              fontSize: '14px',
              color: '#6b7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 12px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#0a0a0a' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6b7280' }}
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <SkeletonCard key={i} lines={1} />)}</div>
      ) : (
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <SortHeader col="Company" label="Company" />
                  <SortHeader col="Position" label="Position" />
                  <SortHeader col="Role" label="Role" />
                  <SortHeader col="Industry" label="Industry" />
                  <SortHeader col="Location" label="Location" />
                  <SortHeader col="Date Applied" label="Date Applied" />
                  <th className="text-left" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', backgroundColor: '#f9fafb' }}>Résumé Form</th>
                  <SortHeader col="Status" label="Status" />
                  <th className="text-left" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', backgroundColor: '#f9fafb' }}>Latest Word</th>
                  <th className="text-left" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', backgroundColor: '#f9fafb' }}>Connections</th>
                  <th className="text-left" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', backgroundColor: '#f9fafb' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '48px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                      {apps?.length === 0 ? 'No applications yet. Add your first!' : 'No results match your filters.'}
                    </td>
                  </tr>
                ) : filtered.map((app, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none', transition: 'background-color 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f9fafb' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: '#0a0a0a', whiteSpace: 'nowrap' }}>{app['Company'] || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#374151', maxWidth: 192 }} className="truncate">{app['Position'] || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#374151', whiteSpace: 'nowrap' }}>{app['Role'] || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#374151', whiteSpace: 'nowrap' }}>{app['Industry'] || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#374151', whiteSpace: 'nowrap' }}>{app['Location'] || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#374151', whiteSpace: 'nowrap' }}>{formatDate(app['Date Applied'])}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#374151' }}>{app['Résumé Form?'] || '—'}</td>
                    <td style={{ padding: '14px 16px' }}><StatusBadge status={app['Status']} /></td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#9ca3af', fontStyle: 'italic', maxWidth: 128 }} className="truncate">{app['Latest word'] || ''}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {app['Connections?'] && app['Connections?'].toUpperCase() !== 'NIL' && app['Connections?'].trim() !== '' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 9999, fontSize: '12px', fontWeight: 500, backgroundColor: '#f0fdf4', color: '#065f46' }}>✓</span>
                      ) : null}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => openEdit(app)}
                        style={{
                          fontSize: '12px',
                          color: '#0066cc',
                          fontWeight: 500,
                          border: '1px solid #dbeafe',
                          backgroundColor: '#eff6ff',
                          borderRadius: 8,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s, color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dbeafe'; e.currentTarget.style.color = '#0052a3' }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#0066cc' }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <Modal title={editRow ? 'Edit Application' : 'Add Application'} onClose={() => setShowModal(false)} wide>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'company', label: 'Company *', type: 'text' },
              { key: 'position', label: 'Position *', type: 'text' },
              { key: 'industry', label: 'Industry', type: 'text' },
              { key: 'role', label: 'Role', type: 'text' },
              { key: 'location', label: 'Location', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            ))}
            <div>
              <label style={labelStyle}>Status *</label>
              <select
                value={form.status}
                onChange={e => setForm(p => ({...p, status: e.target.value}))}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s] || 'Pending'}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date Applied *</label>
              <input type="date" value={form.date_applied} onChange={e => setForm(p => ({...p, date_applied: e.target.value}))}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Date Posted</label>
              <input type="date" value={form.date_posted} onChange={e => setForm(p => ({...p, date_posted: e.target.value}))}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
            {[
              { key: 'cover_letter', label: 'Cover Letter', placeholder: 'Yes/No' },
              { key: 'resume_upload', label: 'Résumé Upload', placeholder: 'Yes/No' },
              { key: 'resume_form', label: 'Résumé Form' },
              { key: 'salary_range', label: 'Salary Range' },
              { key: 'connections', label: 'Connections?' },
              { key: 'latest_word', label: 'Latest Word' },
              { key: 'priority', label: 'Priority' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  type="text"
                  placeholder={f.placeholder || ''}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            ))}
            <div className="col-span-2">
              <label style={labelStyle}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({...p, notes: e.target.value}))}
                rows={3}
                style={{ ...inputStyle, resize: 'none' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowModal(false)}
              style={{
                flex: 1,
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
                color: '#374151',
                fontWeight: 500,
                padding: '10px 16px',
                borderRadius: 8,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f9fafb' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                backgroundColor: saving ? '#0066cc99' : '#0066cc',
                color: 'white',
                fontWeight: 500,
                padding: '10px 16px',
                borderRadius: 8,
                fontSize: '14px',
                cursor: saving ? 'not-allowed' : 'pointer',
                border: 'none',
                transition: 'background-color 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: saving ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = '#0052a3' }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.backgroundColor = '#0066cc' }}
            >
              {saving ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Saving...</>
              ) : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
