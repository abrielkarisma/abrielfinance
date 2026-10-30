import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Button, cn } from './ui.jsx'
import TransactionModal from './TransactionModal.jsx'

const primaryLinks = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/transactions', label: 'Transaksi', icon: '⇅' },
  { to: '/grafik', label: 'Grafik', icon: '📊' }
]
const masterLinks = [
  { to: '/accounts', label: 'Rekening', icon: '◫' },
  { to: '/categories', label: 'Kategori', icon: '▤' }
]

export default function Layout() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [masterOpen, setMasterOpen] = useState(() => /^\/(accounts|categories)(\/|$)/.test(loc.pathname))
  const [mobileSheet, setMobileSheet] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const masterActive = masterLinks.some((l) => loc.pathname.startsWith(l.to))
  useEffect(() => {
    if (masterActive) setMasterOpen(true)
  }, [masterActive])

  const doLogout = () => {
    logout()
    nav('/login')
  }

  const onSaved = () => {
    setAddOpen(false)
    window.dispatchEvent(new Event('tx-changed'))
    nav('/transactions')
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
        <div className="px-3 pb-3">
          <Button onClick={() => setAddOpen(true)} className="w-full">
            + Tambah Transaksi
          </Button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {primaryLinks.map((l) => (
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

          <div className="pt-1">
            <button
              onClick={() => setMasterOpen((o) => !o)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                masterActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <span className="text-base">🗂</span>
              Data Master
              <span className={`ml-auto text-xs transition-transform ${masterOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {masterOpen && (
              <div className="mt-1 space-y-1 border-l border-slate-200 pl-3">
                {masterLinks.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
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
              </div>
            )}
          </div>
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
        {/* Center FAB for add transaction */}
        <button
          onClick={() => setAddOpen(true)}
          className="absolute left-1/2 -top-7 z-10 flex -translate-x-1/2 flex-col items-center gap-0.5"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white shadow-lg ring-4 ring-white">
            +
          </span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shadow">
            Tambah
          </span>
        </button>
        <div className="grid grid-cols-4">
          {primaryLinks.map((l) => (
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
          <button
            onClick={() => setMobileSheet(true)}
            className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${masterActive ? 'text-emerald-700' : 'text-slate-500'}`}
          >
            <span className="text-lg leading-none">🗂</span>
            Data Master
          </button>
        </div>
      </nav>

      {/* Mobile sheet: Data Master */}
      {mobileSheet && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-[env(safe-area-inset-bottom)]">
            <div className="mb-2 text-center text-sm font-bold text-slate-700">Data Master</div>
            {masterLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMobileSheet(false)}
                className={({ isActive }) =>
                  cn(
                    'mt-2 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium',
                    isActive ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-700'
                  )
                }
              >
                <span className="text-base">{l.icon}</span>
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <TransactionModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={onSaved} />
    </div>
  )
}
