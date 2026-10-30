import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { errMsg } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Button, Card, Input } from '../components/ui.jsx'
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

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [profiles, setProfiles] = useState(null)
  const [selected, setSelected] = useState(null)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [setup, setSetup] = useState({ name: '', pin: '', pin2: '' })

  useEffect(() => {
    api.get('/profiles').then((r) => setProfiles(r.data)).catch(() => setProfiles([]))
  }, [])

  const submitPin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      const { data } = await api.post('/auth/profile-login', { profile_id: selected.id, pin })
      login(data)
      nav('/')
    } catch (e) {
      setErr(errMsg(e))
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const submitSetup = async (e) => {
    e.preventDefault()
    setErr('')
    if (setup.pin !== setup.pin2) return setErr('PIN tidak sama')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/setup', { name: setup.name, pin: setup.pin })
      login(data)
      nav('/')
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  
  if (profiles === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(120%_120%_at_50%_0%,#23272c_0%,#14161a_55%,#101216_100%)]">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent opacity-60" />
      </div>
    )
  }

  
  if (profiles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(120%_120%_at_50%_0%,#23272c_0%,#14161a_55%,#101216_100%)] p-4">
        <Card className="w-full max-w-md">
          <h1 className="mb-1 text-xl font-bold">Siapkan Fundy</h1>
          <p className="mb-6 text-sm text-slate-500">Buat profil admin pertama dengan PIN 4 angka. Admin bisa menambah profil lain & mereset PIN.</p>
          <form onSubmit={submitSetup} className="space-y-4">
            <Input label="Nama profil" required value={setup.name} onChange={(e) => setSetup({ ...setup, name: e.target.value })} />
            <Input label="PIN (4 angka)" type="password" inputMode="numeric" maxLength={4} pattern="[0-9]*" required value={setup.pin} onChange={(e) => setSetup({ ...setup, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
            <Input label="Ulangi PIN" type="password" inputMode="numeric" maxLength={4} pattern="[0-9]*" required value={setup.pin2} onChange={(e) => setSetup({ ...setup, pin2: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
            {err && <p className="text-sm text-rose-600">{err}</p>}
            <Button type="submit" disabled={loading || setup.pin.length !== 4 || setup.pin2.length !== 4} className="w-full">{loading ? 'Menyimpan…' : 'Simpan'}</Button>
          </form>
        </Card>
      </div>
    )
  }

  
  if (!selected) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(120%_120%_at_50%_0%,#23272c_0%,#14161a_55%,#101216_100%)] p-6">
        <FundyLogo size={64} mode="dark" className="mb-3 shadow-[0_8px_24px_rgba(0,0,0,0.4)]" />
        <h1 className="mb-1 text-2xl font-bold text-white">Fundy</h1>
        <p className="mb-8 text-sm text-slate-400">Siapa yang mau pakai?</p>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSelected(p); setErr(''); setPin('') }}
              className="group flex flex-col items-center gap-2"
            >
              <span className="transition-transform group-hover:scale-105 group-hover:ring-4 group-hover:ring-white/20 rounded-full">
                <Avatar p={p} size={96} />
              </span>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white">{p.name}</span>
              {p.is_admin && <span className="text-[10px] uppercase tracking-wide text-amber-400">Admin</span>}
            </button>
          ))}
        </div>
      </div>
    )
  }

  
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(120%_120%_at_50%_0%,#23272c_0%,#14161a_55%,#101216_100%)] p-4">
      <div className="w-full max-w-xs text-center">
        <Avatar p={selected} size={88} />
        <h2 className="mt-4 text-xl font-bold text-white">{selected.name}</h2>
        <form onSubmit={submitPin} className="mt-6 space-y-4">
          <Input
            label="PIN"
            type="password"
            inputMode="numeric"
            maxLength={4}
            pattern="[0-9]*"
            autoFocus
            required
            placeholder="••••"
            value={pin}
            className="text-center text-2xl tracking-[0.5em]"
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
          {err && <p className="text-sm text-rose-500">{err}</p>}
          <Button type="submit" disabled={loading || pin.length !== 4} className="w-full">{loading ? 'Memeriksa…' : 'Masuk'}</Button>
          <button type="button" onClick={() => { setSelected(null); setErr(''); setPin('') }} className="text-sm text-slate-400 hover:text-white">
            ← Ganti profil
          </button>
        </form>
      </div>
    </div>
  )
}
