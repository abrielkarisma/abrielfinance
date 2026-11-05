import { X } from 'lucide-react'

export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

/* Category hues — indigo/violet removed. Transfer uses ink grey. */
export const PALETTE = [
  '#1D5FB6', '#C4242A', '#247B50', '#B45309', '#2A8798',
  '#BE408C', '#3F6212', '#D97706', '#57534E', '#0A3A80'
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
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] px-4 text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none active:translate-y-px'
  const variants = {
    primary: 'btn-primary',
    ghost: 'bg-transparent text-ink hover:bg-raised',
    danger: 'btn-danger',
    outline: 'btn-outline'
  }
  return (
    <button className={cn(base, variants[variant], className)} disabled={disabled || loading} {...props}>
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />}
      {children}
    </button>
  )
}

/* Resting card: tone step surface, no border, no shadow.
   Dark: one lightness step above ground. */
export function Card({ className = '', children, ...props }) {
  return <div className={cn('rounded-[20px] bg-surface p-5 dark:bg-[#171916]', className)} {...props}>{children}</div>
}

export function Input({ className = '', label, error, prefix, ...props }) {
  const box = cn(
    'w-full rounded-[12px] min-h-[44px] border border-control bg-surface text-sm text-ink outline-none transition-colors focus:border-accent px-3.5',
    prefix ? 'pl-10' : '',
    error && 'border-down',
    className
  )
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-sub">{label}</span>}
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-sm font-semibold text-faint">
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
      {label && <span className="mb-1.5 block text-sm font-medium text-sub">{label}</span>}
      <select
        className={cn(
          'w-full rounded-[12px] min-h-[44px] border border-control bg-surface text-ink px-3.5 text-sm outline-none transition-colors focus:border-accent',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

/* Pastel chip: pale tint + dark of same hue. Never above a heading. */
export function Badge({ color = '#1D5FB6', children }) {
  return (
    <span
      className="inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold"
      style={{ backgroundColor: shade(color, 0.85), color: shade(color, -0.45) }}
    >
      {children}
    </span>
  )
}

export function ColorPicker({ value, onChange }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-sub">Warna</span>
      <div className="flex flex-wrap items-center gap-2">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`h-9 w-9 rounded-full transition-transform hover:scale-110 ${value === c ? 'ring-2 ring-offset-2 ring-accent' : ''}`}
            style={{ backgroundColor: c }}
            aria-label={`Warna ${c}`}
          />
        ))}
        <label
          className="relative h-9 w-9 cursor-pointer rounded-full border border-control"
          style={{ backgroundColor: value }}
          title="Pilih warna lain"
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
            +
          </span>
        </label>
      </div>
    </div>
  )
}

/* Dialog: flat opaque sheet, scrim only. No blur, no shadow-at-rest. */
export function Modal({ open, onClose, title, subtitle, icon, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[20px] bg-surface p-0 fade-in dark:bg-[#171916]">
        <div className="flex items-start justify-between gap-3 bg-raised px-6 pb-4 pt-5 dark:bg-[#1e211c]">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-accent-soft text-accent-ink dark:text-accent">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-ink leading-tight">{title}</h3>
              {subtitle && <p className="mt-0.5 text-sm text-sub">{subtitle}</p>}
            </div>
          </div>
          <button
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-faint transition-colors hover:bg-active hover:text-ink"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 pb-6 pt-4">{children}</div>
      </div>
    </div>
  )
}
