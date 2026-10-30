import { useEffect, useState } from 'react'



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
  setTimeout(() => dismiss(id), 4000)
  return id
}
toast.success = (message) => toast({ type: 'success', message })
toast.error = (message) => toast({ type: 'error', message })

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
      {list.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={`toast-in pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 text-left text-sm font-medium text-white shadow-lg ${
            t.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          <span>{t.type === 'error' ? '⚠️' : '✅'}</span>
          <span className="flex-1">{t.message}</span>
        </button>
      ))}
    </div>
  )
}
