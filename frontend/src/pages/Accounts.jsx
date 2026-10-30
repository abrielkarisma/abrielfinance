import { useCallback, useEffect, useState } from 'react'
import api, { errMsg, fmtIDR } from '../lib/api.js'
import { Button, Card, Input, Modal, Select } from '../components/ui.jsx'

const TYPE_LABEL = { bank: 'Bank', ewallet: 'E-Wallet', cash: 'Tunai' }
const PALETTE = ['#f97316', '#3b82f6', '#ec4899', '#a855f7', '#ef4444', '#14b8a6', '#22c55e', '#84cc16', '#eab308', '#64748b']
const emptyForm = { name: '', type: 'bank', color: PALETTE[0], opening_balance: '' }

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [balances, setBalances] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [err, setErr] = useState('')
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(() => {
    api.get('/accounts').then((r) => setAccounts(r.data)).catch(() => {})
    api.get('/reports/accounts').then((r) => {
      const m = {}
      r.data.accounts.forEach((a) => { m[a.account.id] = a })
      setBalances(m)
    }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setErr('')
    setModalOpen(true)
  }

  const openEdit = (a) => {
    setEditing(a)
    setForm({ name: a.name, type: a.type, color: a.color, opening_balance: a.opening_balance })
    setErr('')
    setModalOpen(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    const payload = { ...form, opening_balance: Number(form.opening_balance) || 0 }
    try {
      if (editing) await api.patch(`/accounts/${editing.id}`, payload)
      else await api.post('/accounts', payload)
      setModalOpen(false)
      load()
    } catch (e2) {
      setErr(errMsg(e2))
    }
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/accounts/${deleting.id}`)
      setDeleting(null)
      load()
    } catch (e2) {
      alert(errMsg(e2))
    }
  }

  const balanceOf = (id) => balances[id]?.balance ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Rekening</h1>
        <Button onClick={openAdd}>+ Tambah Akun</Button>
      </div>

      <Card>
        <ul className="divide-y divide-slate-100">
          {accounts.length === 0 && (
            <li className="py-8 text-center text-sm text-slate-400">Belum ada akun. Tambah akun bank, e-wallet, atau tunai.</li>
          )}
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: a.color }} />
                <div>
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-xs text-slate-400">{TYPE_LABEL[a.type] || a.type} · Saldo awal {fmtIDR(a.opening_balance)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${balanceOf(a.id) >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                  {fmtIDR(balanceOf(a.id))}
                </span>
                <button className="text-sm text-emerald-600 hover:underline" onClick={() => openEdit(a)}>Edit</button>
                <button className="text-sm text-rose-600 hover:underline" onClick={() => setDeleting(a)}>Hapus</button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Akun' : 'Tambah Akun'}>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Nama Akun" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth: BCA, Mandiri, OVO" />
          <Select label="Jenis" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="bank">Bank</option>
            <option value="ewallet">E-Wallet</option>
            <option value="cash">Tunai</option>
          </Select>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-600">Warna</span>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-7 w-7 rounded-full ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Input label="Saldo Awal (Rp)" type="number" min="0" step="1000" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} />
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Hapus Akun">
        <p className="text-sm text-slate-600">
          Yakin mau menghapus akun <b>{deleting?.name}</b>? Akun yang masih punya transaksi tidak bisa dihapus.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
          <Button variant="danger" onClick={confirmDelete}>Hapus</Button>
        </div>
      </Modal>
    </div>
  )
}
