import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { cn } from './ui.jsx'

const links = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/transactions', label: 'Transaksi', icon: '⇅' },
  { to: '/categories', label: 'Kategori', icon: '▤' }
]

export default function Layout() {
  const { user, logout } = useAuth()
  const nav = useNavigate()

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
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
            onClick={() => {
              logout()
              nav('/login')
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Keluar
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
