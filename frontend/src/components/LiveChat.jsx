import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { cn } from './ui.jsx'

/* Boci — "Sarangnya Boci": ruang coklat gelap hangat + aksen amber menyala.
   Terinspirasi maskotnya: kucing robot chibi, coklat matte, wajah layar amber.
   Panel ini dunia sendiri, terpisah dari Fundy yang paper terang. */

const MENU_ITEMS = [
  { key: 'close', label: 'Tutup dan simpan', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg> },
  { key: 'new', label: 'Chat baru', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg> },
  { key: 'history', label: 'Riwayat chat', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg> }
]

const QUICK = [
  { label: 'Catat jajan 20rb', msg: 'catat jajan 20000' },
  { label: 'Sisa budget bulan ini?', msg: 'sisa budget bulan ini berapa?' },
  { label: 'Pengeluaran minggu ini?', msg: 'total pengeluaranku minggu ini berapa?' }
]

const AUTO_CLOSE_MS = 5 * 60 * 1000
const DRAFT_KEY = 'fundy-boci-draft'

/* Ripple jam pasir: titik-titik melayang, bukan angka */
function Hourglass({ remaining }) {
  const dots = 12
  const lit = Math.ceil((remaining / AUTO_CLOSE_MS) * dots)
  return (
    <span className="flex items-center gap-[3px]" aria-hidden title="Sesi tersimpan otomatis">
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          className="h-1 w-1 rounded-full"
          style={{ backgroundColor: i < dots - lit ? '#8a6a3b' : '#f5a623', opacity: i < dots - lit ? 0.35 : 1 }}
        />
      ))}
    </span>
  )
}

export default function LiveChat() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('splash') // splash | chat | history | detail
  const [msgs, setMsgs] = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
      return d && Array.isArray(d.messages) ? d.messages : []
    } catch {
      return []
    }
  })
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
  const [, setTick] = useState(0)

  const bodyRef = useRef(null)
  const inputRef = useRef(null)
  const dragRef = useRef(null)
  const movedRef = useRef(false)
  const msgsRef = useRef(msgs)
  const lastActiveRef = useRef(Date.now())

  useEffect(() => {
    msgsRef.current = msgs
  }, [msgs])

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ messages: msgsRef.current, lastActive: Date.now() }))
  }
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
  }
  const draftExpired = () => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
      if (!d || !d.lastActive) return false
      return Date.now() - d.lastActive > AUTO_CLOSE_MS
    } catch {
      return false
    }
  }

  const draftRemaining = () => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
      if (!d || !d.lastActive) return AUTO_CLOSE_MS
      return Math.max(0, AUTO_CLOSE_MS - (Date.now() - d.lastActive))
    } catch {
      return AUTO_CLOSE_MS
    }
  }

  // get FAB posisi awal (kiri tengah) kalau belum pernah setup
  const fabTop = fabY != null ? `${fabY}px` : '50%'
  const fabTransform = 'translateY(-50%)'

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [open, msgs, busy, view])

  // detak ripple jam pasir tiap 10 detik
  useEffect(() => {
    if (!open) return
    const iv = setInterval(() => setTick((t) => t + 1), 10000)
    return () => clearInterval(iv)
  }, [open ])

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
    if (open) {
      setOpen(false)
      return
    }
    setMenuOpen(false)
    // kalau ada draft sesi aktif dan belum expired -> buka langsung ke sesi itu
    if (!draftExpired() && msgsRef.current.length > 0) {
      setView('chat')
      lastActiveRef.current = Date.now()
      saveDraft()
    } else {
      setView('splash')
    }
    setOpen(true)
  }

  const startNewChat = () => {
    clearDraft()
    setMsgs([])
    setView('chat')
    setMenuOpen(false)
    lastActiveRef.current = Date.now()
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
    // simpan draft sesi aktif dulu (masih bisa dilanjutin, rehat 5 mnt)
    if (msgsRef.current.length > 0) {
      lastActiveRef.current = Date.now()
      saveDraft()
    }
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
    if (msgsRef.current.length > 0) {
      const firstUser = msgsRef.current.find((m) => m.role === 'user')
      const title = firstUser ? String(firstUser.content).slice(0, 60) : 'Obrolan baru'
      try {
        await api.post('/livechat/close', { title, messages: msgsRef.current })
      } catch { /* simpan gagal, tetap lanjut ke splash */ }
    }
    clearDraft()
    setMsgs([])
    setView('splash')
  }

  // auto-close: 5 menit tanpa interaksi -> simpan ke server + back ke splash
  useEffect(() => {
    if (!open || view !== 'chat') return
    const iv = setInterval(() => {
      if (draftExpired()) {
        closeChat()
      }
    }, 5000)
    return () => clearInterval(iv)
  }, [open, view])

  const send = async (text) => {
    const raw = typeof text === 'string' ? text : input
    const trimmed = raw.trim()
    if (!trimmed || busy) return
    const next = [...msgs, { role: 'user', content: trimmed }]
    setMsgs(next)
    setInput('')
    setBusy(true)
    lastActiveRef.current = Date.now()
    try {
      const { data } = await api.post('/livechat', { message: trimmed, history: msgs })
      setMsgs((m) => [...m, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', content: 'Sinyal ke sarang putus. Coba lagi ya. (' + (e?.response?.data?.detail || 'koneksi gagal') + ')' }])
    } finally {
      setBusy(false)
      saveDraft()
    }
  }

  /* ---------- potongan tampilan ---------- */

  const renderBar = (title, sub) => (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="boci-bob flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full">
        <img src="/boci.png" alt="Boci" className="h-full w-full object-cover" />
      </span>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[15px] font-bold text-[#f5efe2]">{title}</div>
        <div className="flex items-center gap-1.5 text-xs text-[#a89372]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f5a623]" />
          <span className="truncate">{sub}</span>
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          onClick={() => setMenuOpen((m) => !m)}
          aria-label="Menu"
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#a89372] transition-colors hover:bg-white/10 hover:text-[#f5efe2]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5h.01M12 12h.01M12 19h.01" /></svg>
        </button>
        <button
          onClick={() => setOpen(false)}
          aria-label="Tutup"
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#a89372] transition-colors hover:bg-white/10 hover:text-[#f5efe2]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  )

  const renderMenu = () => (
    menuOpen && (
      <>
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
        <div className="panel-in absolute left-2 top-16 z-20 w-52 overflow-hidden rounded-[16px] bg-[#2b2118] p-1.5">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => item.key === 'close' ? closeChat() : item.key === 'new' ? startNewChat() : openHistory()}
              className="flex min-h-[44px] w-full items-center gap-2.5 rounded-[10px] px-3 text-sm text-[#d8c9ae] transition-colors hover:bg-white/10 hover:text-[#f5efe2]"
            >
              <span className="text-[#8a6a3b]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </>
    )
  )

  /* Splash: Boci raksasa + undangan, bukan kartu form */
  const renderSplash = () => (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* kunang-kunang */}
      <span aria-hidden className="chip-drift pointer-events-none absolute left-8 top-14 rounded-full bg-[#5a4632] px-3 py-1.5 text-[11px] font-medium text-[#d8c9ae]">catat gofood 25rb</span>
      <span aria-hidden className="chip-drift-2 chip-drift pointer-events-none absolute right-6 top-28 rounded-full bg-[#5a4632] px-3 py-1.5 text-[11px] font-medium text-[#d8c9ae]">sisa budget?</span>
      <div className="flex flex-1 flex-col items-center justify-center px-6 pt-10 text-center">
        <span className="boci-bob flex h-32 w-32 items-center justify-center overflow-hidden rounded-full ring-4 ring-[#f5a623]/30">
          <img src="/boci.png" alt="Boci" className="h-full w-full object-cover" />
        </span>
        <h2 className="mt-5 text-[26px] font-bold leading-tight text-[#f5efe2]">Halo, aku Boci.</h2>
        <p className="mt-1.5 max-w-[26ch] text-sm leading-relaxed text-[#a89372]">
          Asisten kantong yang tinggal di Fundy. Ceritain pengeluaranmu, biar aku yang nyatet.
        </p>
        <button
          onClick={startNewChat}
          className="mt-6 flex min-h-[52px] items-center gap-2 rounded-full bg-[#f5a623] px-7 text-[15px] font-bold text-[#241a10] transition-transform hover:brightness-110 active:scale-95"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Mulai ngobrol
        </button>
        <button
          onClick={openHistory}
          className="mt-1 flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-[#a89372] transition-colors hover:text-[#f5efe2]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>
          Lihat obrolan lama
        </button>
      </div>
    </div>
  )

  const renderBubbles = (list) => (
    list.map((m, i) => (
      <div key={i} className={cn('msg-in flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
        {m.role === 'assistant' && (
          <span className="mr-1.5 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full">
            <img src="/boci.png" alt="" className="h-full w-full object-cover" />
          </span>
        )}
        <div
          className={cn(
            'max-w-[82%] whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed',
            m.role === 'user'
              ? 'rounded-[18px] rounded-br-[6px] bg-[#f5a623] font-medium text-[#241a10]'
              : 'rounded-[18px] rounded-bl-[6px] bg-[#2b2118] text-[#f5efe2]'
          )}
        >
          {m.content}
        </div>
      </div>
    ))
  )

  const renderChat = () => (
    <>
      {renderBar('Boci', 'di sarang, siap nyatet')}
      {renderMenu()}
      <div ref={bodyRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {msgs.length === 0 && (
          <div className="pt-2">
            <p className="text-sm leading-relaxed text-[#a89372]">
              Halo {profile?.name?.split(' ')[0] || 'kawan'}! Mau catat apa hari ini?
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <button
                  key={q.label}
                  onClick={() => send(q.msg)}
                  className="chip-drift flex min-h-[44px] items-center rounded-full bg-[#2b2118] px-4 text-xs font-semibold text-[#f5a623] transition-colors hover:bg-[#3a2d1f]"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {renderBubbles(msgs)}
        {busy && (
          <div className="msg-in flex justify-start">
            <span className="mr-1.5 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full">
              <img src="/boci.png" alt="" className="h-full w-full object-cover" />
            </span>
            <div className="flex items-center gap-1.5 rounded-[18px] rounded-bl-[6px] bg-[#2b2118] px-4 py-3">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#f5a623]" />
              <span className="typing-dot typing-dot-2 h-1.5 w-1.5 rounded-full bg-[#f5a623]" />
              <span className="typing-dot typing-dot-3 h-1.5 w-1.5 rounded-full bg-[#f5a623]" />
            </div>
          </div>
        )}
      </div>

      <div className="relative px-3 pb-3 pt-1">
        <div className="flex items-center justify-center gap-2 pb-1.5">
          <Hourglass remaining={draftRemaining()} />
          <span className="text-[11px] text-[#8a6a3b]">obrolan tersimpan otomatis</span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#2b2118] p-1.5 pl-4">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Tulis ke Boci…"
            className="min-h-[44px] flex-1 bg-transparent text-sm text-[#f5efe2] outline-none placeholder:text-[#8a6a3b]"
          />
          <button
            onClick={() => send()}
            disabled={busy || !input.trim()}
            aria-label="Kirim"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f5a623] text-[#241a10] transition-transform hover:brightness-110 active:scale-95 disabled:opacity-30"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
          </button>
        </div>
      </div>
    </>
  )

  const renderHistory = () => (
    <>
      {renderBar('Jejak Boci', `${sessions.length} obrolan tersimpan`)}
      {renderMenu()}
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        <button
          onClick={startNewChat}
          className="mb-1 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#f5a623] text-sm font-bold text-[#241a10] transition-transform hover:brightness-110 active:scale-[0.98]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Obrolan baru
        </button>
        {sessionsLoading ? (
          <div className="py-6 text-center text-xs text-[#a89372]">Mengintip arsip…</div>
        ) : sessions.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#a89372]">Belum ada jejak. Ngobrol dulu yuk.</div>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => openDetail(s.id)}
              className="flex w-full items-center gap-3 rounded-[14px] bg-[#2b2118] px-3.5 py-3 text-left transition-colors hover:bg-[#3a2d1f]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#f5efe2]">{s.title}</span>
                <span className="block text-xs text-[#8a6a3b] tnum">
                  {s.message_count} pesan · {s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                </span>
              </span>
              <svg width="15" height="15" className="shrink-0 text-[#8a6a3b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          ))
        )}
      </div>
    </>
  )

  const renderDetail = () => (
    <>
      {renderBar(detail?.title || 'Jejak', 'arsip, tidak bisa dilanjut')}
      <div ref={bodyRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {(detail?.messages || []).map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[82%] whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'rounded-[18px] rounded-br-[6px] bg-[#f5a623] font-medium text-[#241a10]'
                  : 'rounded-[18px] rounded-bl-[6px] bg-[#2b2118] text-[#f5efe2]'
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div className="pt-2 text-center text-[11px] text-[#8a6a3b]">Akhir jejak. Mulai obrolan baru buat lanjut.</div>
      </div>
      <div className="px-3 pb-3">
        <button
          onClick={startNewChat}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#f5a623] text-sm font-bold text-[#241a10] transition-transform hover:brightness-110 active:scale-[0.98]"
        >
          Obrolan baru
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* FAB: Boci mengintip dari lingkaran amber */}
      <button
        ref={dragRef}
        onPointerDown={onDragStart}
        onClick={(e) => { if (e.detail > 0 && !movedRef.current) toggleOpen() }}
        aria-label="Boci chat"
        title="Boci, asisten keuangan"
        className="fixed left-4 z-40 flex h-16 w-16 cursor-grab touch-none items-center justify-center overflow-hidden rounded-full ring-4 ring-[#f5a623] active:cursor-grabbing"
        style={{ top: fabTop, transform: fabTransform, backgroundColor: '#241a10' }}
      >
        <img src="/boci.png" alt="Boci" className="h-full w-full scale-110 object-cover" />
      </button>

      {/* Panel: sarang coklat gelap, satu dunia sendiri */}
      {open && (
        <div className="panel-in fixed left-4 top-1/2 z-40 flex h-[520px] max-h-[82svh] w-[calc(100vw-2rem)] max-w-sm -translate-y-1/2 flex-col overflow-hidden rounded-[24px] bg-[#1d150e] text-[#f5efe2]">
          {view === 'splash' && renderSplash()}
          {view === 'chat' && renderChat()}
          {view === 'history' && renderHistory()}
          {view === 'detail' && renderDetail()}
        </div>
      )}
    </>
  )
}
