import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { errMsg } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Button, Card, Input } from '../components/ui.jsx'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      const { data } = await api.post('/auth/login', form)
      login(data)
      nav('/')
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="mb-1 text-xl font-bold">Masuk</h1>
        <p className="mb-6 text-sm text-slate-500">Lanjutkan ke aplikasi Keuangan Pribadi.</p>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <Button type="submit" disabled={loading} className="w-full">{loading ? 'Memproses…' : 'Masuk'}</Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          Belum punya akun?{' '}
          <Link to="/register" className="font-medium text-emerald-600">Daftar</Link>
        </p>
      </Card>
    </div>
  )
}
