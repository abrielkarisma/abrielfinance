import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3, Bell, Boxes, Eye, EyeOff, Landmark, LayoutDashboard, List, LogOut, Moon, Plus, Settings, Sun, Tags
} from 'lucide-react'
import api from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useHideBal } from '../context/BalContext.jsx'
import TransactionModal from './TransactionModal.jsx'
import { cn } from './ui.jsx'
import FundyLogo from './FundyLogo.jsx'

const I = {
  dashboard: <LayoutDashboard size={18} strokeWidth={1.8} />,
  list: <List size={18} strokeWidth={1.8} />,
  chart: <BarChart3 size={18} strokeWidth={1.8} />,
  bank: <Landmark size={18} strokeWidth={1.8} />,
  box: <Boxes size={18} strokeWidth={1.8} />,
  tag: <Tags size={18} strokeWidth={1.8} />,
  bell: <Bell size={18} strokeWidth={1.8} />,
  gear: <Settings size={18} strokeWidth={1.8} />,
  sun: <Sun size={18} strokeWidth={1.8} />,
  moon: <Moon size={18} strokeWidth={1.8} />,
  logout: <LogOut size={18} strokeWidth={1.8} />,
  plus: <Plus size={24} strokeWidth={2} />
}

const primaryLinks = [
  { to: '/', label: 'Dashboard', icon: I.dashboard },
  { to: '/transactions', label: 'Transaksi', icon: I.list },
  { to: '/grafik', label: 'Grafik', icon: I.chart }
]
const masterLinks = [
  { to: '/accounts', label: 'Rekening', icon: I.bank },
  { to: '/categories', label: 'Kategori', icon: I.tag }
]

function NavItem({ link }) {
  return (
    <NavLink
      to={link.to}
      end={link.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors duration-150',
          isActive ? 'bg-accent-soft text-accent-ink' : 'text-slate-500 hover:bg-slate-100 hover:text-ink'
        )
      }
    >
      {link.icon}
      {link.label}
    </NavLink>
  )
}

export default function Layout() {
  const { logout, profile } = useAuth()
  const { hide, toggle } = useHideBal()
  const navigate = useNavigate()
  const [addOpen, setAddOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('fundy-theme') === 'dark')
  const [dueCount, setDueCount] = useState(0)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('fundy-theme', dark ? 'dark' : 'light')
    window.dispatchEvent(new Event('fundy-theme'))
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

  const bellBadge = dueCount > 0 && (
    <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-down px-1 text-[10px] font-bold text-white">
      {dueCount}
    </span>
  )

  const brand = (
    <>
      <FundyLogo size={36} mode="auto" className="shrink-0" />
      <div className="leading-tight">
        <div className="text-base font-bold text-ink">Fundy</div>
        <div className="text-xs text-slate-400">Keuangan pribadi</div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-paper">
      {}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-3 px-5 pb-2 pt-6">{brand}</div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          <div className="sw-label px-3 pb-1.5 pt-2">Menu</div>
          {primaryLinks.map((l) => <NavItem key={l.to} link={l} />)}

          <div className="sw-label px-3 pb-1.5 pt-5">Data master</div>
          {masterLinks.map((l) => <NavItem key={l.to} link={l} />)}

          <NavLink
            to="/reminders"
            className={({ isActive }) =>
              cn(
                'mt-2 flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors duration-150',
                isActive ? 'bg-accent-soft text-accent-ink' : 'text-slate-500 hover:bg-slate-100 hover:text-ink'
              )
            }
          >
            <span className="relative inline-flex">{I.bell}{bellBadge}</span>
            Pengingat
          </NavLink>

          {profile?.is_admin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  'mt-0.5 flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors duration-150',
                  isActive ? 'bg-accent-soft text-accent-ink' : 'text-slate-500 hover:bg-slate-100 hover:text-ink'
                )
              }
            >
              {I.gear}
              Kelola profil
            </NavLink>
          )}
        </nav>

        <div className="space-y-1 border-t border-slate-100 px-3 py-3">
          {profile && (
            <button
              onClick={() => navigate('/admin')}
              className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left hover:bg-slate-100"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: profile.avatar_color }}>
                {(profile.name || '?').charAt(0).toUpperCase()}
              </span>
              <span className="truncate text-sm font-medium text-ink">{profile.name}</span>
            </button>
          )}
          <button
            onClick={toggle}
            aria-label="Sembunyikan/tampilkan saldo"
            title="Sembunyikan/tampilkan saldo"
            className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-ink"
          >
            {hide ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
            <span>{hide ? 'Tampilkan saldo' : 'Sembunyikan saldo'}</span>
          </button>
          <button
            onClick={() => setDark((d) => !d)}
            className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-ink"
          >
            {dark ? I.sun : I.moon}
            <span>{dark ? 'Mode terang' : 'Mode gelap'}</span>
          </button>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm text-slate-500 hover:bg-down-soft hover:text-down"
          >
            {I.logout}
            Keluar
          </button>
        </div>
      </aside>

      {}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FundyLogo size={32} mode="auto" className="shrink-0" />
            <span className="text-base font-bold text-ink">Fundy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={toggle} className="rounded-[8px] p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Sembunyikan/tampilkan saldo">
              {hide ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {profile?.is_admin && (
              <button
                onClick={() => navigate('/admin')}
                aria-label="Kelola profil"
                title="Kelola profil"
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
                style={{ backgroundColor: profile.avatar_color }}
              >
                {(profile.name || '?').charAt(0).toUpperCase()}
              </button>
            )}
            <button onClick={() => setDark((d) => !d)} className="rounded-[8px] p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Toggle tema">
              {dark ? I.sun : I.moon}
            </button>
            <NavLink to="/reminders" className="relative rounded-[8px] p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Pengingat">
              {I.bell}{bellBadge}
            </NavLink>
            <button onClick={() => { logout(); navigate('/login') }} className="rounded-[8px] p-1.5 text-slate-500 hover:bg-down-soft hover:text-down" aria-label="Keluar">
              {I.logout}
            </button>
          </div>
        </div>
      </header>

      {}
      <main className="px-4 pb-40 pt-6 lg:pl-64 lg:pr-8 lg:pb-28 lg:pt-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>

      {}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {primaryLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                isActive ? 'text-accent' : 'text-slate-400'
              )
            }
          >
            {l.icon}
            {l.label}
          </NavLink>
        ))}
        <NavLink
          to="/data-master"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
              isActive ? 'text-accent' : 'text-slate-400'
            )
          }
        >
          {I.box}
          Data master
        </NavLink>
      </nav>

      {}
      <button
        onClick={() => setAddOpen(true)}
        aria-label="Tambah transaksi"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1b1d1f] text-white shadow-[0_8px_24px_rgba(16,24,40,0.35)] transition-transform hover:bg-[#33373a] active:scale-95 lg:bottom-8 lg:right-8"
      >
        {I.plus}
      </button>

      <TransactionModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
