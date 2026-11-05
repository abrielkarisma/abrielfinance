import { useState } from 'react'
import { Card } from '../components/ui.jsx'
import FundyLogo from '../components/FundyLogo.jsx'

const AVATARS = ['#f97316', '#3b82f6', '#ec4899', '#a855f7', '#ef4444', '#14b8a6', '#f59e0b', '#22c55e', '#84cc16', '#64748b']

export function Avatar({ p, size = 24 }) {
  const color = p.avatar_color || AVATARS[p.id % AVATARS.length]
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white"
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.42 }}
    >
      {(p.name || '?').trim().charAt(0).toUpperCase()}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.57-5.17 3.57-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.29a7.2 7.2 0 0 1 0-4.58V6.61H1.28a12 12 0 0 0 0 10.78l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.98 11.98 0 0 0 1.28 6.61l4 3.1C6.22 6.87 8.87 4.77 12 4.77Z" />
    </svg>
  )
}

export default function Login() {
  const [error, setError] = useState('')

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(120%_120%_at_50%_0%,#23272c_0%,#14161a_55%,#101216_100%)] p-6">
      <Card className="w-full max-w-sm text-center">
        <div className="flex flex-col items-center">
          <FundyLogo size={64} mode="dark" className="mb-3 shadow-[0_8px_24px_rgba(0,0,0,0.4)]" />
          <h1 className="mb-1 text-2xl font-bold">Fundy</h1>
          <p className="mb-8 text-sm text-slate-500">Masuk dengan akun Google kamu</p>
          <a
            href="/api/auth/google"
            onClick={() => setError('')}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow transition hover:bg-slate-100"
          >
            <GoogleIcon />
            Lanjutkan dengan Google
          </a>
          {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}
        </div>
      </Card>
    </div>
  )
}
