import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addLamp } from '../api'
import { useAppData } from '../context/AppDataContext'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import SkeletonCard from '../components/SkeletonCard'
import StarRating from '../components/StarRating'

const EMPTY_FORM = {
  company: '', industry: '', alumni: '', motivation_score: 3,
  open_positions: '', linkedin_alumni: '', non_alumni_linkedin: '', notes: '',
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

export default function Lamp({ onAuthError }) {
  const { getLampData, invalidate } = useAppData()
  const [companies, setCompanies] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('motivation')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const data = await getLampData()
      if (data !== null) setCompanies(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err?.status === 401) { onAuthError?.(); return }
      setCompanies([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const sorted = [...(companies || [])].sort((a, b) => {
    if (sortBy === 'name') return (a.company || '').localeCompare(b.company || '')
    if (sortBy === 'industry') return (a.industry || '').localeCompare(b.industry || '')
    return (b.motivation_score || 0) - (a.motivation_score || 0)
  })

  const handleSave = async () => {
    if (!form.company) { setToast({ msg: 'Company name is required', type: 'error' }); return }
    setSaving(true)
    try {
      const res = await addLamp({ ...form, motivation_score: String(form.motivation_score) })
      if (res.ok) {
        setShowModal(false)
        setForm(EMPTY_FORM)
        setToast({ msg: 'Company added ✓', type: 'success' })
        invalidate('lamp')
        await load()
      } else {
        const d = await res.json()
        setToast({ msg: d.detail || 'Save failed', type: 'error' })
      }
    } catch { setToast({ msg: 'Network error', type: 'error' }) }
    setSaving(false)
  }

  return (
    <div className="max-w-5xl mx-auto md:px-12 px-5 py-8">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center gap-4 mb-2">
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
        <div className="flex-1">
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0a0a0a' }}>LAMP List</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: 2 }}>List · Alumni · Motivation · Positions</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setShowModal(true) }}
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
          + Add Company
        </button>
      </div>

      <div className="flex gap-2 mt-4 mb-6">
        {[
          { key: 'motivation', label: 'Motivation' },
          { key: 'name', label: 'Name A–Z' },
          { key: 'industry', label: 'Industry' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setSortBy(s.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 9999,
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              backgroundColor: sortBy === s.key ? '#0a0a0a' : 'white',
              color: sortBy === s.key ? 'white' : '#374151',
              border: sortBy === s.key ? '1px solid #0a0a0a' : '1px solid #e5e7eb',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <SkeletonCard key={i} lines={4} />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#9ca3af' }}>
          <svg style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p style={{ fontWeight: 500, fontSize: '14px' }}>No companies yet</p>
          <p style={{ fontSize: '13px', marginTop: 4 }}>Add your target employers to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((c, i) => (
            <div
              key={i}
              className="transition-all duration-200 hover:-translate-y-0.5"
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 16,
                padding: 24,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0066cc' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-3">
                  <p style={{ fontSize: '18px', fontWeight: 600, color: '#0a0a0a' }}>{c.company}</p>
                  {c.industry && (
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      fontSize: '12px',
                      fontWeight: 500,
                      padding: '3px 10px',
                      borderRadius: 9999,
                      marginTop: 6,
                    }}>
                      {c.industry}
                    </span>
                  )}
                </div>
                <StarRating value={c.motivation_score} readonly />
              </div>

              {c.alumni ? (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {c.alumni.split(',').map(a => a.trim()).filter(Boolean).map((a, j) => (
                    <span key={j} style={{
                      display: 'inline-block',
                      backgroundColor: '#f0fdf4',
                      color: '#065f46',
                      border: '1px solid #d1fae5',
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '2px 10px',
                      borderRadius: 9999,
                    }}>
                      {a}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: 8 }}>No alumni connections</p>
              )}

              {c.open_positions && (
                <p style={{ fontSize: '13px', color: '#374151', marginTop: 8 }}>
                  <span style={{ fontWeight: 500 }}>Open positions: </span>{c.open_positions}
                </p>
              )}

              <div className="flex gap-4 flex-wrap mt-2">
                {c.linkedin_alumni && (
                  <a href={c.linkedin_alumni} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#0066cc' }}
                    onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                    onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}>
                    LinkedIn (Alumni)
                  </a>
                )}
                {c.non_alumni_linkedin && (
                  <a href={c.non_alumni_linkedin} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#0066cc' }}
                    onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                    onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}>
                    LinkedIn (Other)
                  </a>
                )}
              </div>

              {c.notes && (
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: 8 }} className="line-clamp-2">
                  {c.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Add Company" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label style={labelStyle}>Company *</label>
              <input type="text" value={form.company} onChange={e => setForm(p => ({...p, company: e.target.value}))}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }} />
            </div>
            <div>
              <label style={labelStyle}>Industry</label>
              <input type="text" value={form.industry} onChange={e => setForm(p => ({...p, industry: e.target.value}))}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }} />
            </div>
            <div>
              <label style={labelStyle}>Alumni (comma-separated names)</label>
              <input type="text" value={form.alumni} onChange={e => setForm(p => ({...p, alumni: e.target.value}))}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }} />
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Motivation Score *</label>
              <StarRating value={form.motivation_score} onChange={v => setForm(p => ({...p, motivation_score: v}))} />
            </div>
            <div>
              <label style={labelStyle}>Open Positions</label>
              <input type="text" value={form.open_positions} onChange={e => setForm(p => ({...p, open_positions: e.target.value}))}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }} />
            </div>
            <div>
              <label style={labelStyle}>LinkedIn Alumni URL</label>
              <input type="text" value={form.linkedin_alumni} onChange={e => setForm(p => ({...p, linkedin_alumni: e.target.value}))}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }} />
            </div>
            <div>
              <label style={labelStyle}>Non-Alumni LinkedIn URL</label>
              <input type="text" value={form.non_alumni_linkedin} onChange={e => setForm(p => ({...p, non_alumni_linkedin: e.target.value}))}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }} />
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
                rows={2}
                style={{ ...inputStyle, resize: 'none' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#0066cc'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,102,204,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }} />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowModal(false)}
              style={{
                flex: 1, border: '1px solid #e5e7eb', backgroundColor: 'white',
                color: '#374151', fontWeight: 500, padding: '10px 16px',
                borderRadius: 8, fontSize: '14px', cursor: 'pointer', transition: 'background-color 0.15s',
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
                flex: 1, backgroundColor: '#0066cc', color: 'white', fontWeight: 500,
                padding: '10px 16px', borderRadius: 8, fontSize: '14px',
                cursor: saving ? 'not-allowed' : 'pointer', border: 'none',
                transition: 'background-color 0.15s', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = '#0052a3' }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.backgroundColor = '#0066cc' }}
            >
              {saving ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Saving...</> : 'Add Company'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
