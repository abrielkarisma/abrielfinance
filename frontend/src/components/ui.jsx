export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

export const PALETTE = [
  '#f97316', '#3b82f6', '#ec4899', '#a855f7', '#ef4444',
  '#14b8a6', '#f59e0b', '#22c55e', '#84cc16', '#64748b'
]

export function Button({ variant = 'primary', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50'
  }
  return <button className={cn(base, variants[variant], className)} {...props} />
}

export function Card({ className = '', children }) {
  return <div className={cn('rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200', className)}>{children}</div>
}

export function Input({ className = '', label, error, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>}
      <input
        className={cn(
          'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100',
          error && 'border-rose-400',
          className
        )}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-rose-500">{error}</span>}
    </label>
  )
}

export function Select({ className = '', label, children, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>}
      <select
        className={cn(
          'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

export function Badge({ color = '#64748b', children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {children}
    </span>
  )
}

// Custom color picker: preset swatches + a native "any color" input.
export function ColorPicker({ value, onChange }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-600">Warna</span>
      <div className="flex flex-wrap items-center gap-2">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${value === c ? 'ring-2 ring-offset-2 ring-slate-500' : ''}`}
            style={{ backgroundColor: c }}
            aria-label={`Warna ${c}`}
          />
        ))}
        <label
          className="relative h-8 w-8 cursor-pointer rounded-full ring-1 ring-slate-300"
          style={{ backgroundColor: value }}
          title="Pilih warna lain"
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white drop-shadow">
            ＋
          </span>
        </label>
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose} aria-label="Tutup">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
