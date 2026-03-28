export default function ToastContainer({ toasts, dismiss }) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold cursor-pointer select-none animate-fade-in"
          style={{
            background: t.type === 'error' ? '#EF4444' : t.type === 'warn' ? '#F59E0B' : '#22C55E',
            color: 'white',
            minWidth: 260,
          }}
        >
          <span>{t.type === 'error' ? '✕' : t.type === 'warn' ? '⚠' : '✓'}</span>
          <span className="flex-1">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
