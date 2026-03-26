export default function StarRating({ value = 0, onChange, readonly = false }) {
  const stars = [1, 2, 3, 4, 5]
  return (
    <div className="flex gap-0.5">
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange && onChange(s)}
          className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: '16px',
            color: s <= value ? '#f59e0b' : '#e5e7eb',
            lineHeight: 1,
          }}
        >
          ★
        </button>
      ))}
    </div>
  )
}
