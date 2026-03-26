import { useEffect } from 'react'

export default function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full overflow-hidden"
        style={{
          backgroundColor: 'white',
          borderRadius: 20,
          maxWidth: wide ? 720 : 560,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0a0a0a', margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              fontSize: '18px',
              lineHeight: 1,
              transition: 'background-color 150ms, color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f3f4f6'; e.currentTarget.style.color = '#0a0a0a' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9ca3af' }}
          >
            &times;
          </button>
        </div>
        <div
          className="overflow-y-auto"
          style={{
            padding: '24px 28px',
            maxHeight: '60vh',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
