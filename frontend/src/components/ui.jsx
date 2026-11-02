import { X } from 'lucide-react'

export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

export const PALETTE = [
  '#1D5FBF', '#C41C29', '#2F7A45', '#B45309', '#2A8798',
  '#7C3AED', '#BE408C', '#3F6212', '#4F46E5', '#57534E'
]


function hexToRgb(h) {
  const s = h.replace('#', '')
  const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16))
}
function clamp(n) { return Math.max(0, Math.min(255, Math.round(n))) }
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex)
  const t = amt < 0 ? 0 : 255
  const a = Math.abs(amt)
  return `rgb(${clamp(r + (t - r) * a)}, ${clamp(g + (t - g) * a)}, ${clamp(b + (t - b) * a)})`
}

export function Button({ variant = 'primary', className = '', loading = false, disabled = false, children, ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none active:translate-y-px h-11'
  const variants = {
    primary: 'btn-primary',
    ghost: 'bg-transparent text-ink hover:bg-slate-100',
    danger: 'bg-down text-white hover:bg-red-600',
    outline: 'btn-outline'
  }
  return (
    <button className={cn(base, variants[variant], className)} disabled={disabled || loading} {...props}>
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />}
      {children}
    </button>
  )
}

export function Card({ className = '', children }) {
  return <div className={cn('rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.05)]', className)}>{children}</div>
}

export function Input({ className = '', label, error, prefix, ...props }) {
  const box = cn(
    'w-full rounded-[10px] border border-[#e6e6e6] bg-white text-sm outline-none transition-shadow h-11 focus:border-accent focus:ring-2 focus:ring-accent/15',
    prefix ? 'pl-10' : 'px-3.5',
    error && 'border-down',
    className
  )
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-600">{label}</span>}
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-sm font-semibold text-slate-400">
            {prefix}
          </span>
        )}
        <input className={box} {...props} />
      </div>
      {error && <span className="mt-1 block text-xs font-medium text-down">{error}</span>}
    </label>
  )
}

export function Select({ className = '', label, children, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-600">{label}</span>}
      <select
        className={cn(
          'w-full rounded-[10px] border border-[#e6e6e6] bg-white px-3.5 text-sm outline-none h-11 focus:border-accent focus:ring-2 focus:ring-accent/15',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}


export function Badge({ color = '#1D5FBF', children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: shade(color, 0.85), color: shade(color, -0.45) }}
    >
      {children}
    </span>
  )
}

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
            className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${value === c ? 'ring-2 ring-offset-2 ring-accent' : ''}`}
            style={{ backgroundColor: c }}
            aria-label={`Warna ${c}`}
          />
        ))}
        <label
          className="relative h-8 w-8 cursor-pointer rounded-full border border-slate-300"
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

export function Modal({ open, onClose, title, subtitle, icon, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_rgba(16,24,40,0.22)] max-h-[90vh] overflow-y-auto fade-in">
        <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-5">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-ink leading-tight">{title}</h3>
              {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button
            className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  )
}
