import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { cn } from './ui.jsx'

const links = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/transactions', label: 'Transaksi', icon: '⇅' },
  { to: '/accounts', label: 'Rekening', icon: '◫' },
  { to: '/categories', label: 'Kategori', icon: '▤' }
]

export default function Layout() {
  const { user, logout } = useAuth()
  const nav = useNavigate()

  const doLogout = () => {
    logout()
    nav('/login')
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar: desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold">K</div>
          <div>
            <div className="text-sm font-bold">Keuangan</div>
            <div className="text-xs text-slate-500">Pribadi</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
                )
              }
            >
              <span className="text-base">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user?.name}</div>
              <div className="truncate text-xs text-slate-500">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={doLogout}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* Header: mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-sm text-white font-bold">K</div>
          <span className="text-sm font-bold">Keuangan Pribadi</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="max-w-28 truncate text-sm font-medium text-slate-700">{user?.name}</span>
          <button onClick={doLogout} className="text-xs font-medium text-slate-500 hover:text-rose-600">Keluar</button>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24 lg:p-8 lg:pb-8">
        <Outlet />
      </main>

      {/* Bottom nav: mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid grid-cols-4">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-xs font-medium',
                  isActive ? 'text-emerald-700' : 'text-slate-500'
                )
              }
            >
              <span className="text-lg leading-none">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
