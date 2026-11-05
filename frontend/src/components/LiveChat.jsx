import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { cn } from './ui.jsx'

const MENU_ITEMS = [
  { key: 'close', label: 'Tutup chat', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg> },
  { key: 'new', label: 'Chat baru', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg> },
  { key: 'history', label: 'Riwayat chat', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg> }
]

export default function LiveChat() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('splash') // splash | chat | history | detail
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [fabY, setFabY] = useState(() => {
    const saved = localStorage.getItem('fundy-boci-fab-y')
    return saved != null ? Number(saved) : null
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [detail, setDetail] = useState(null)

  const bodyRef = useRef(null)
  const inputRef = useRef(null)
  const dragRef = useRef(null)
  const movedRef = useRef(false)

  // get FAB posisi awal (kiri tengah) kalau belum pernah setup
  const fabTop = fabY != null ? `${fabY}px` : '50%'
  const fabTransform = 'translateY(-50%)'

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [open, msgs, busy, view])

  // drag vertikal saja
  const onDragStart = useCallback((e) => {
    e.preventDefault()
    movedRef.current = false
    const startY = e.clientY
    const startTop = fabY != null ? fabY : window.innerHeight / 2
    const drag = (ev) => {
      const dy = ev.clientY - startY
      if (Math.abs(dy) > 3) movedRef.current = true
      const newY = Math.min(Math.max(startTop + dy, 80), window.innerHeight - 80)
      setFabY(newY)
      localStorage.setItem('fundy-boci-fab-y', String(Math.round(newY)))
    }
    const up = () => {
      window.removeEventListener('pointermove', drag)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', drag)
    window.addEventListener('pointerup', up)
  }, [fabY])

  const toggleOpen = () => {
    setOpen((o) => !o)
    if (!open) {
      setView('splash')
      setMenuOpen(false)
    }
  }

  const startNewChat = () => {
    setMsgs([])
    setView('chat')
    setMenuOpen(false)
  }

  const goSplash = () => {
    setView('splash')
    setMenuOpen(false)
  }

  const fetchHistory = async () => {
    setSessionsLoading(true)
    try {
      const { data } = await api.get('/livechat/history')
      setSessions(data)
    } catch {
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }

  const openHistory = () => {
    setMenuOpen(false)
    setView('history')
    fetchHistory()
  }

  const openDetail = async (id) => {
    try {
      const { data } = await api.get(`/livechat/history/${id}`)
      setDetail(data)
      setView('detail')
    } catch {
      setView('history')
    }
  }

  // close chat -> simpan ke server lalu lempar ke splash (tidak bisa lanjut)
  const closeChat = async () => {
    setMenuOpen(false)
    if (msgs.length > 0) {
      const firstUser = msgs.find((m) => m.role === 'user')
      const title = firstUser ? String(firstUser.content).slice(0, 60) : 'Obrolan baru'
      try {
        await api.post('/livechat/close', { title, messages: msgs })
      } catch { /* simpan gagal, tetap lanjut ke splash */ }
    }
    setMsgs([])
    setView('splash')
  }

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

  const bubbleColor = profile?.avatar_color || '#64748b'

  const renderHeader = (title, onClose) => (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/5" style={{ backgroundColor: bubbleColor }}>
        <img src="/boci.png" alt="Boci" className="h-full w-full object-cover" />
      </span>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-ink">{title}</div>
        <div className="flex items-center gap-1 text-xs text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> online
        </div>
      </div>
      <button onClick={() => setOpen(false)} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Tutup">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  )

  const renderSplash = () => (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full shadow-lg ring-1 ring-black/5" style={{ backgroundColor: bubbleColor }}>
        <img src="/boci.png" alt="Boci" className="h-full w-full object-cover" />
      </div>
      <div>
        <div className="text-base font-bold text-ink">Boci</div>
        <div className="text-xs text-slate-400">Asisten keuangan pribadimu</div>
      </div>
      <button
        onClick={startNewChat}
        className="mt-1 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-md transition-transform active:scale-95"
        style={{ backgroundColor: bubbleColor }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Chat baru
      </button>
      <button
        onClick={openHistory}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ink"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
        Riwayat chat
      </button>
    </div>
  )

  const renderChat = () => (
    <>
      {renderHeader('Boci', () => null)}
      <div ref={bodyRef} className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50 px-4 py-3">
        {msgs.length === 0 && (
          <div className="text-xs text-slate-400">
            Halo {profile?.name}! Aku Boci 🤖 Tanya atau catat pengeluaran di sini. Contoh: <i>"catat gofood 25000 jam 12:30"</i>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed',
                m.role === 'user' ? 'rounded-br-md text-white' : 'rounded-bl-md border border-slate-200 bg-white text-ink'
              )}
              style={m.role === 'user' ? { backgroundColor: bubbleColor } : undefined}
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

      <div className="relative border-t border-slate-100 px-3 py-2.5">
        {menuOpen && (
          <div className="absolute bottom-full left-1 mb-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => item.key === 'close' ? closeChat() : item.key === 'new' ? startNewChat() : openHistory()}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-ink"
              >
                <span className="text-slate-400">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen((m) => !m)}
            aria-label="Menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5h.01M12 12h.01M12 19h.01"/></svg>
          </button>
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-transform active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: bubbleColor }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
      </div>
    </>
  )

  const renderHistory = () => (
    <>
      {renderHeader('Riwayat chat', () => null)}
      <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-3">
        <button
          onClick={startNewChat}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 hover:border-accent hover:text-accent"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Chat baru
        </button>
        {sessionsLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">Memuat…</div>
        ) : sessions.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">Belum ada riwayat chat</div>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => openDetail(s.id)}
              className="mb-1.5 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left hover:shadow-sm"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: bubbleColor }}>
                <img src="/boci.png" alt="Boci" className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{s.title}</span>
                <span className="block text-xs text-slate-400">
                  {s.message_count} pesan · {s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                </span>
              </span>
              <svg width="14" height="14" className="shrink-0 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          ))
        )}
      </div>
    </>
  )

  const renderDetail = () => (
    <>
      {renderHeader(detail?.title || 'Riwayat', () => setView('history'))}
      <div ref={bodyRef} className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50 px-4 py-3">
        {(detail?.messages || []).map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed',
                m.role === 'user' ? 'rounded-br-md text-white' : 'rounded-bl-md border border-slate-200 bg-white text-ink'
              )}
              style={m.role === 'user' ? { backgroundColor: bubbleColor } : undefined}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div className="pt-1 text-center text-[11px] text-slate-400">— Akhir riwayat chat —</div>
      </div>
    </>
  )

  return (
    <>
      {/* FAB chatbot — kiri, draggable vertikal aja */}
      <button
        ref={dragRef}
        onPointerDown={onDragStart}
        onClick={(e) => { if (e.detail > 0 && !movedRef.current) toggleOpen() }}
        aria-label="Boci chat"
        title="Boci — asisten keuangan"
        className="fixed left-4 z-40 flex h-14 w-14 cursor-grab touch-none items-center justify-center overflow-hidden rounded-full shadow-xl ring-1 ring-black/10 active:cursor-grabbing"
        style={{ top: fabTop, transform: fabTransform, backgroundColor: bubbleColor }}
      >
        <img src="/boci.png" alt="Boci" className="h-full w-full object-cover" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed left-4 top-1/2 z-40 flex h-[480px] w-[calc(100vw-2rem)] max-w-sm -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {view === 'splash' && renderSplash()}
          {view === 'chat' && renderChat()}
          {view === 'history' && renderHistory()}
          {view === 'detail' && renderDetail()}
        </div>
      )}
    </>
  )
}
