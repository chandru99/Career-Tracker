import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addNetworking } from '../api'
import { useAppData } from '../context/AppDataContext'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import SkeletonCard from '../components/SkeletonCard'

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

const EMPTY_FORM = {
  acquaintance_name: '', company_name: '', roles_interested_suggested: '',
  contact: '', date_contacted: new Date().toISOString().split('T')[0], comments: '',
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

export default function Networking({ onAuthError }) {
  const { getNet, invalidate } = useAppData()
  const [contacts, setContacts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [expanded, setExpanded] = useState({})
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const data = await getNet()
      if (data !== null) setContacts(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err?.status === 401) { onAuthError?.(); return }
      setContacts([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.acquaintance_name || !form.company_name) {
      setToast({ msg: 'Name and Company are required', type: 'error' }); return
    }
    setSaving(true)
    try {
      const res = await addNetworking(form)
      if (res.ok) {
        setShowModal(false)
        setForm(EMPTY_FORM)
        setToast({ msg: 'Contact saved ✓', type: 'success' })
        invalidate('networking')
        await load()
      } else {
        const d = await res.json()
        setToast({ msg: d.detail || 'Save failed', type: 'error' })
      }
    } catch { setToast({ msg: 'Network error', type: 'error' }) }
    setSaving(false)
  }

  return (
    <div className="max-w-6xl mx-auto md:px-12 px-5 py-8">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

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
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0a0a0a', flex: 1 }}>Networking Tracker</h1>
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
          + Add Contact
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <SkeletonCard key={i} lines={4} />)}
        </div>
      ) : contacts?.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#9ca3af' }}>
          <svg style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p style={{ fontWeight: 500, fontSize: '14px' }}>No contacts yet</p>
          <p style={{ fontSize: '13px', marginTop: 4 }}>Add your first networking contact to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(contacts || []).map((c, i) => {
            const isExpanded = expanded[i]
            const hasLongComment = (c.comments || '').length > 120
            return (
              <div
                key={i}
                className="transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 16,
                  padding: 20,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0066cc' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex items-center justify-center flex-shrink-0 ${getAvatarStyle(c.acquaintance_name)}`}
                    style={{ width: 36, height: 36, borderRadius: '50%', fontSize: '13px', fontWeight: 600 }}
                  >
                    {getInitials(c.acquaintance_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p style={{ fontSize: '15px', fontWeight: 600, color: '#0a0a0a' }}>{c.acquaintance_name}</p>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: 2 }}>{c.company_name}</p>
                      </div>
                      <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0, marginTop: 2 }}>{formatDate(c.date_contacted)}</span>
                    </div>
                  </div>
                </div>

                {c.roles_interested_suggested && (
                  <span
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '4px 10px',
                      borderRadius: 9999,
                      marginTop: 12,
                    }}
                  >
                    {c.roles_interested_suggested}
                  </span>
                )}

                {c.contact && (
                  <a
                    href={c.contact.startsWith('http') ? c.contact : `mailto:${c.contact}`}
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'inline-block', fontSize: '12px', color: '#0066cc', marginTop: 4 }}
                    onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                    onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
                  >
                    {c.contact}
                  </a>
                )}

                {c.comments && (
                  <div style={{ marginTop: 8 }}>
                    <p
                      style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}
                      className={!isExpanded && hasLongComment ? 'line-clamp-2' : ''}
                    >
                      {c.comments}
                    </p>
                    {hasLongComment && (
                      <button
                        onClick={() => setExpanded(p => ({...p, [i]: !p[i]}))}
                        style={{ fontSize: '12px', color: '#0066cc', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4, fontWeight: 500 }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#0052a3' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#0066cc' }}
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}

                {c.leads?.length > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      backgroundColor: '#f9fafb',
                      borderRadius: 12,
                      padding: 12,
                      border: '1px solid #f3f4f6',
                    }}
                  >
                    <p
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: '#6b7280',
                        marginBottom: 8,
                      }}
                    >
                      Leads ({c.leads.length})
                    </p>
                    <div className="space-y-1.5">
                      {c.leads.map((lead, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <div
                            className={`flex items-center justify-center flex-shrink-0 ${getAvatarStyle(lead.name)}`}
                            style={{ width: 20, height: 20, borderRadius: '50%', fontSize: '10px', fontWeight: 600 }}
                          >
                            {getInitials(lead.name)}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>{lead.name}</span>
                          {lead.company && <span style={{ fontSize: '12px', color: '#9ca3af' }}>· {lead.company}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <Modal title="Add Contact" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {[
              { key: 'acquaintance_name', label: 'Name *', type: 'text' },
              { key: 'company_name', label: 'Company *', type: 'text' },
              { key: 'roles_interested_suggested', label: 'Roles Interested / Suggested', type: 'text' },
              { key: 'contact', label: 'Contact (email / LinkedIn / phone)', type: 'text' },
              { key: 'date_contacted', label: 'Date Contacted *', type: 'date' },
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
              <label style={labelStyle}>Comments</label>
              <textarea
                value={form.comments}
                onChange={e => setForm(p => ({...p, comments: e.target.value}))}
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
                backgroundColor: '#0066cc',
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
              {saving ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Saving...</> : 'Save Contact'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
