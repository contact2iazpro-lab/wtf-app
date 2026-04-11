/**
 * Shared UI components used across multiple admin pages.
 */

// ── Tailwind class strings ───────────────────────────────────────────────────
export const inputCls = "w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-orange-DEFAULT placeholder-slate-500 resize-none"
export const inputClsErr = "w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-red-500 text-white text-sm focus:outline-none placeholder-slate-500 resize-none"

// ── Difficulty config & badge ────────────────────────────────────────────────
export const DIFFICULTIES = [
  { value: 'Facile', color: '#22C55E', bg: 'rgba(34,197,94,0.15)' },
  { value: 'Normal', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  { value: 'Expert', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
]

export function difficultyStyle(value) {
  return DIFFICULTIES.find(d => d.value === value) || DIFFICULTIES[1]
}

export function DifficultyBadge({ value }) {
  const d = difficultyStyle(value)
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: d.bg, color: d.color }}
    >
      {value || 'Normal'}
    </span>
  )
}

// ── Status config & badge ────────────────────────────────────────────────────
export const STATUSES = [
  { value: 'published', label: 'Publié',    color: '#10B981', bg: 'rgba(16,185,129,0.15)', icon: '✅' },
  { value: 'reserve',   label: 'Réserve',   color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', icon: '🔒' },
  { value: 'draft',     label: 'Brouillon', color: '#FF6B1A', bg: 'rgba(255,107,26,0.15)', icon: '✏️' },
  { value: 'doublon',   label: 'Doublon',   color: '#6B7280', bg: 'rgba(107,114,128,0.15)', icon: '🔄' },
]

export function StatusBadge({ value }) {
  const s = STATUSES.find(st => st.value === value) || STATUSES[2]
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1"
      style={{ background: s.bg, color: s.color }}
    >
      {s.icon} {s.label}
    </span>
  )
}

// ── Toggle switch ────────────────────────────────────────────────────────────
export function Toggle({ on, onChange, color }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(!on) }}
      className="relative w-10 h-5 rounded-full transition-all flex-shrink-0"
      style={{ background: on ? (color || '#22C55E') : '#374151' }}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
        style={{ left: on ? '22px' : '2px' }}
      />
    </button>
  )
}

// ── Sort icon ────────────────────────────────────────────────────────────────
export function SortIcon({ field, current, dir }) {
  if (field !== current) return <span className="text-slate-600 ml-1">↕</span>
  return <span className="ml-1" style={{ color: '#FF6B1A' }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

// ── Char counter ─────────────────────────────────────────────────────────────
export function CharCounter({ value, max, min }) {
  const len = (value || '').length
  const isOver = len > max
  const isUnder = min != null && len > 0 && len < min
  return (
    <span className={`text-xs font-mono tabular-nums ${isOver ? 'text-red-400 font-bold' : isUnder ? 'text-amber-400' : 'text-slate-600'}`}>
      {len}/{max}{isOver && ' ⚠'}
    </span>
  )
}
