const COLOR_MAP = {
  'text-blue-600': '#0a0a0a',
  'text-amber-600': '#b45309',
  'text-red-600': '#dc2626',
  'text-green-600': '#00875a',
  'text-teal-600': '#0066cc',
  'text-purple-600': '#7c3aed',
  'text-gray-600': '#6b7280',
}

export default function StatCard({ label, value, color = 'text-gray-600', sub }) {
  const valueColor = COLOR_MAP[color] || '#0a0a0a'

  return (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '20px 24px',
      }}
    >
      <p
        style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#6b7280',
          display: 'block',
          marginBottom: 8,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '32px',
          fontWeight: 600,
          lineHeight: 1,
          color: valueColor,
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: 4 }}>{sub}</p>
      )}
    </div>
  )
}
