import { useEffect, useState } from 'react'
import { CheckCircle2, X, XCircle } from 'lucide-react'

let listeners = []
let items = []
let idSeq = 0

function emit() {
  listeners.forEach((l) => l(items))
}

function dismiss(id) {
  items = items.filter((t) => t.id !== id)
  emit()
}

export function toast({ type = 'success', message }) {
  const id = ++idSeq
  items = [...items, { id, type, message }]
  emit()
  setTimeout(() => dismiss(id), 4200)
  return id
}
toast.success = (message) => toast({ type: 'success', message })
toast.error = (message) => toast({ type: 'error', message })

const META = {
  success: {
    title: 'Berhasil',
    Icon: CheckCircle2,
    chip: 'bg-up-soft text-up',
    bar: 'bg-up'
  },
  error: {
    title: 'Gagal',
    Icon: XCircle,
    chip: 'bg-down-soft text-down',
    bar: 'bg-down'
  }
}

export function Toaster() {
  const [list, setList] = useState(items)
  useEffect(() => {
    const l = (next) => setList([...next])
    listeners.push(l)
    return () => {
      listeners = listeners.filter((f) => f !== l)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {list.map((t) => {
        const { title, Icon, chip, bar } = META[t.type] || META.success
        return (
          <div
            key={t.id}
            className="toast-in pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-[12px] bg-surface p-3.5 pr-9 dark:bg-[#171916]"
          >
            <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${chip}`}>
              <Icon size={17} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">{title}</div>
              <div className="mt-0.5 text-sm leading-snug text-sub">{t.message}</div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-[8px] text-faint transition-colors hover:bg-raised hover:text-ink"
              aria-label="Tutup notifikasi"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
