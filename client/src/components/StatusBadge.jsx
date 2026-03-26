const STATUS_MAP = {
  'app submited': { bg: '#eff6ff', text: '#1d4ed8', label: 'Applied' },
  'interview received': { bg: '#fffbeb', text: '#b45309', label: 'Interview' },
  'pre-interview assessment received': { bg: '#f5f3ff', text: '#6d28d9', label: 'Assessment' },
  'rejected': { bg: '#fef2f2', text: '#991b1b', label: 'Rejected' },
}

export default function StatusBadge({ status }) {
  const key = (status || '').toLowerCase().trim()
  const cfg = STATUS_MAP[key]
    || (key.includes('assessment') ? { bg: '#f5f3ff', text: '#6d28d9', label: 'Assessment' } : null)
    || { bg: '#f3f4f6', text: '#6b7280', label: status || 'Pending' }

  return (
    <span
      className="inline-flex items-center whitespace-nowrap"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        fontSize: '11px',
        fontWeight: 500,
        padding: '2px 10px',
        borderRadius: 9999,
      }}
    >
      {cfg.label}
    </span>
  )
}
