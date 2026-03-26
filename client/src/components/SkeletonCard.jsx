export default function SkeletonCard({ lines = 3 }) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 20,
      }}
      className="space-y-3 animate-pulse"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="rounded-md"
          style={{
            height: i === 0 ? 16 : 12,
            backgroundColor: '#f3f4f6',
            width: i === 0 ? '66%' : i === lines - 1 ? '50%' : '100%',
          }}
        />
      ))}
    </div>
  )
}
