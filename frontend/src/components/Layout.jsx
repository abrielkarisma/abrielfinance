import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import api from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import TransactionModal from './TransactionModal.jsx'

const primaryLinks = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/transactions', label: 'Transaksi', icon: '🧾' },
  { to: '/grafik', label: 'Grafik', icon: '📈' }
]

const masterLinks = [
  { to: '/accounts', label: 'Rekening', icon: '🏦' },
  { to: '/categories', label: 'Kategori', icon: '🏷️' }
]

function NavItem({ link }) {
  return (
    <NavLink
      to={link.to}
      end={link.to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      <span className="text-base">{link.icon}</span>
      {link.label}
    </NavLink>
  )
}

export default function Layout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [addOpen, setAddOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('myfinance-theme') === 'dark')
  const [dueCount, setDueCount] = useState(0)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('myfinance-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        const now = new Date()
        const y = now.getFullYear()
        const m = String(now.getMonth() + 1).padStart(2, '0')
        const d = String(now.getDate()).padStart(2, '0')
        const today = `${y}-${m}-${d}`
        const { data } = await api.get('/reminders/due', { params: { date_str: today } })
        if (!alive) return
        const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        const due = data.filter((r) => !r.time || r.time <= hm)
        setDueCount(due.length)
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          due.forEach((r) => {
            const key = `shownR-${r.id}-${today}`
            if (!localStorage.getItem(key)) {
              new Notification(r.title, { body: r.note || 'Pengingat', tag: `r-${r.id}-${today}` })
              localStorage.setItem(key, '1')
            }
          })
        }
      } catch {}
    }
    check()
    const iv = setInterval(check, 60000)
    return () => { alive = false; clearInterval(iv) }
  }, [])

  const bell = (
    <span className="relative inline-flex">
      <span>🔔</span>
      {dueCount > 0 && (
        <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
          {dueCount}
        </span>
      )}
    </span>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== Sidebar (desktop) ===== */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white">K</span>
          <div className="leading-tight">
            <div className="text-base font-bold text-slate-900">MyFinance</div>
            <div className="text-xs text-slate-400">Personal Finance</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Menu</div>
          {primaryLinks.map((l) => <NavItem key={l.to} link={l} />)}

          <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Data Master</div>
          {masterLinks.map((l) => <NavItem key={l.to} link={l} />)}

          <NavLink
            to="/reminders"
            className={({ isActive }) =>
              `mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            {bell}
            Pengingat
          </NavLink>
        </nav>

        <div className="border-t border-slate-200 px-4 py-4">
          <button
            onClick={() => setDark((d) => !d)}
            className="mb-3 flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <span>{dark ? 'Mode Terang' : 'Mode Gelap'}</span>
            <span>{dark ? '☀️' : '🌙'}</span>
          </button>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-rose-50 hover:text-rose-600"
          >
            <span>🚪</span> Keluar
          </button>
        </div>
      </aside>

      {/* ===== Header (mobile) ===== */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="leading-tight">
            <div className="text-base font-bold text-slate-900">MyFinance</div>
            <div className="text-xs text-slate-400">Personal Finance</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark((d) => !d)}
              className="text-lg"
              aria-label="Toggle tema"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <NavLink to="/reminders" aria-label="Pengingat">
              {bell}
            </NavLink>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="text-sm text-slate-500"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="px-4 pb-28 pt-6 lg:pl-72 lg:pr-8 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>

      {/* ===== Bottom nav (mobile) ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {primaryLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                isActive ? 'text-emerald-700' : 'text-slate-500'
              }`
            }
          >
            <span className="text-lg">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
        <NavLink
          to="/accounts"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
              isActive ? 'text-emerald-700' : 'text-slate-500'
            }`
          }
        >
          <span className="text-lg">🏦</span>
          Data Master
        </NavLink>
      </nav>

      {/* ===== FAB (mobile) ===== */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-16 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-1"
        aria-label="Tambah transaksi"
      >
        <span className="-top-7 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white shadow-lg transition-transform hover:scale-105">
          +
        </span>
        <span className="text-xs font-medium text-slate-500">Tambah</span>
      </button>

      <TransactionModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
