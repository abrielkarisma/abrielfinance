import { useEffect, useRef, useState } from 'react'
import api from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { cn } from './ui.jsx'

export default function LiveChat() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bodyRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [open, msgs, busy])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const next = [...msgs, { role: 'user', content: text }]
    setMsgs(next)
    setInput('')
    setBusy(true)
    try {
      const { data } = await api.post('/livechat', { message: text, history: msgs })
      setMsgs((m) => [...m, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', content: '⚠️ ' + (e?.response?.data?.detail || 'Bot tidak terjangkau. Coba lagi.') }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {/* Tombol bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat dengan Ayfredo"
        title="Chat dengan Ayfredo"
        className="fixed bottom-24 right-20 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95 lg:bottom-8 lg:right-24"
        style={{ backgroundColor: profile?.avatar_color || '#64748b', color: '#fff' }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        )}
      </button>

      {/* Panel chat */}
      {open && (
        <div className="fixed bottom-40 right-4 z-40 flex h-[420px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl lg:bottom-24 lg:right-24">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: profile?.avatar_color || '#64748b' }}>
              {(profile?.name || 'A').charAt(0).toUpperCase()}
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-ink">Ayfredo</div>
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> online
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Tutup">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Body pesan */}
          <div ref={bodyRef} className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50 px-4 py-3">
            {msgs.length === 0 && (
              <div className="text-xs text-slate-400">
                Halo {profile?.name}! Aku Ayfredo 🤖 Tanya atau catat pengeluaran di sini. Contoh: <i>"catat gofood 25000 jam 12:30"</i>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'rounded-br-md text-white'
                      : 'rounded-bl-md border border-slate-200 bg-white text-ink'
                  )}
                  style={m.role === 'user' ? { backgroundColor: profile?.avatar_color || '#64748b' } : undefined}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2.5">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Tulis pesan…"
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              aria-label="Kirim"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: profile?.avatar_color || '#64748b' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
