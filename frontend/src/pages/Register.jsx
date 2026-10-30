import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { errMsg } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Button, Card, Input } from '../components/ui.jsx'

export default function Register() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      const { data } = await api.post('/auth/register', form)
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
        <h1 className="mb-1 text-xl font-bold">Daftar</h1>
        <p className="mb-6 text-sm text-slate-500">Buat akun baru untuk mulai mencatat keuangan.</p>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Nama" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password (min. 8 karakter)" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <Button type="submit" disabled={loading} className="w-full">{loading ? 'Memproses…' : 'Daftar'}</Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-medium text-emerald-600">Masuk</Link>
        </p>
      </Card>
    </div>
  )
}
