import { useEffect, useState } from 'react'

export default function Toast({ message, type = 'success', onClose }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const accentColor = type === 'success' ? '#00875a' : type === 'info' ? '#0066cc' : '#dc2626'
  const iconBg = type === 'success' ? '#dcfce7' : type === 'info' ? '#eff6ff' : '#fee2e2'
  const iconColor = type === 'success' ? '#00875a' : type === 'info' ? '#0066cc' : '#dc2626'

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-opacity duration-300 ${visible ? 'opacity-100 toast-enter' : 'opacity-0'}`}
      style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex items-center gap-3" style={{ padding: '14px 16px' }}>
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: iconBg,
            color: iconColor,
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {type === 'success' ? '✓' : type === 'info' ? 'i' : '✕'}
        </div>
        <span style={{ fontSize: '14px', color: '#0a0a0a' }}>{message}</span>
        <button
          onClick={() => { setVisible(false); setTimeout(onClose, 300) }}
          style={{
            marginLeft: 'auto',
            fontSize: '16px',
            color: '#9ca3af',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            lineHeight: 1,
            padding: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#0a0a0a' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af' }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
