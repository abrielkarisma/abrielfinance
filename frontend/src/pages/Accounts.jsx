import { useCallback, useEffect, useState } from 'react'
import api, { errMsg, fmtIDR, fmtMoney, parseMoney } from '../lib/api.js'
import { Button, Card, ColorPicker, Input, Modal, Select } from '../components/ui.jsx'
import { useHideBal } from '../context/BalContext.jsx'
import { toast } from '../components/toast.jsx'

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
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const { hide } = useHideBal()

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
    setForm({ name: a.name, type: a.type, color: a.color, opening_balance: fmtMoney(a.opening_balance) })
    setErr('')
    setModalOpen(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    const payload = { ...form, opening_balance: parseMoney(form.opening_balance) }
    try {
      if (editing) await api.patch(`/accounts/${editing.id}`, payload)
      else await api.post('/accounts', payload)
      toast.success(editing ? 'Akun berhasil diperbarui' : 'Akun berhasil ditambahkan')
      setModalOpen(false)
      load()
    } catch (e2) {
      setErr(errMsg(e2))
      toast.error(errMsg(e2))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting || deletingBusy) return
    setDeletingBusy(true)
    try {
      await api.delete(`/accounts/${deleting.id}`)
      setDeleting(null)
      load()
      toast.success('Akun berhasil dihapus')
    } catch (e2) {
      toast.error(errMsg(e2))
    } finally {
      setDeletingBusy(false)
    }
  }

  const balanceOf = (id) => balances[id]?.balance ?? 0
  const fmtBal = (n) => (hide ? 'Rp ••••••' : fmtIDR(n))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Rekening</h1>
        <div className="flex items-center gap-2">
          <Button onClick={openAdd}>+ Tambah Akun</Button>
        </div>
      </div>

      <Card>
        <ul className="divide-y divide-slate-100">
          {accounts.length === 0 && (
            <li className="py-8 text-center text-sm text-slate-400">Belum ada akun. Tambah akun bank, e-wallet, atau tunai.</li>
          )}
          {accounts.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.name}</div>
                  <div className="text-xs text-slate-400">{TYPE_LABEL[a.type] || a.type} · Saldo awal {fmtIDR(a.opening_balance)}</div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={`text-sm font-semibold ${balanceOf(a.id) >= 0 ? 'text-slate-800' : 'text-down'}`}>
                  {fmtBal(balanceOf(a.id))}
                </span>
                <div className="flex items-center gap-2">
                  <button className="text-xs font-medium text-accent hover:underline" onClick={() => openEdit(a)}>Edit</button>
                  <button className="text-xs font-medium text-down hover:underline" onClick={() => setDeleting(a)}>Hapus</button>
                </div>
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
          <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
          <Input label="Saldo Awal (Rp)" type="text" inputMode="numeric" pattern="[0-9.]*" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: fmtMoney(e.target.value) })} />
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving}>Simpan</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Hapus Akun">
        <p className="text-sm text-slate-600">
          Yakin mau menghapus akun <b>{deleting?.name}</b>? Akun yang masih punya transaksi tidak bisa dihapus.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
          <Button variant="danger" loading={deletingBusy} onClick={confirmDelete}>Hapus</Button>
        </div>
      </Modal>
    </div>
  )
}
