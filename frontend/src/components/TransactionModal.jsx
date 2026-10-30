import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import api, { errMsg, fmtMoney, parseMoney } from '../lib/api.js'
import { Button, Input, Modal, Select } from './ui.jsx'
import { toast } from './toast.jsx'

const emptyForm = {
  kind: 'expense',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  time: '',
  category_id: '',
  account_id: '',
  to_account_id: '',
  note: ''
}

export default function TransactionModal({ open, onClose, editing, onSaved }) {
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const loadAccounts = () => api.get('/accounts').then((r) => setAccounts(r.data)).catch(() => {})
  const loadCategories = () => api.get('/categories').then((r) => setCategories(r.data)).catch(() => {})

  useEffect(() => {
    if (!open) return
    loadAccounts()
    loadCategories()
  }, [open])

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        kind: editing.kind,
        amount: fmtMoney(editing.amount),
        date: editing.date,
        time: editing.time || '',
        category_id: editing.category_id ?? '',
        account_id: editing.account_id,
        to_account_id: editing.to_account_id ?? '',
        note: editing.note || ''
      })
    } else {
      setForm({ ...emptyForm })
    }
    setErr('')
  }, [open, editing])

  const kindCats = categories.filter((c) => c.kind === form.kind)
  const toOptions = accounts.filter((a) => String(a.id) !== String(form.account_id))

  const setKind = (kind) => {
    if (kind === 'transfer') {
      setForm({ ...form, kind, category_id: '', to_account_id: form.account_id || '' })
    } else {
      setForm({ ...form, kind, to_account_id: '' })
    }
  }

  const setNow = () => {
    const n = new Date()
    setForm({
      ...form,
      date: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`,
      time: `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    const payload = {
      kind: form.kind,
      amount: parseMoney(form.amount),
      date: form.date,
      time: form.time || null,
      account_id: Number(form.account_id),
      to_account_id: form.kind === 'transfer' && form.to_account_id ? Number(form.to_account_id) : null,
      category_id: form.category_id ? Number(form.category_id) : null,
      note: form.note || null
    }
    try {
      if (editing) await api.patch(`/transactions/${editing.id}`, payload)
      else await api.post('/transactions', payload)
      toast.success(editing ? 'Transaksi berhasil diperbarui' : 'Transaksi berhasil ditambahkan')
      window.dispatchEvent(new Event('tx-changed'))
      onSaved && onSaved()
      onClose && onClose()
    } catch (e2) {
      setErr(errMsg(e2))
      toast.error(errMsg(e2))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15'

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Transaksi' : 'Tambah Transaksi'}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setKind('expense')}
            className={`whitespace-nowrap rounded-xl px-2 py-2.5 text-[13px] font-semibold transition-colors ${form.kind === 'expense' ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setKind('income')}
            className={`whitespace-nowrap rounded-xl px-2 py-2.5 text-[13px] font-semibold transition-colors ${form.kind === 'income' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Pemasukan
          </button>
          <button
            type="button"
            onClick={() => setKind('transfer')}
            className={`whitespace-nowrap rounded-xl px-2 py-2.5 text-[13px] font-semibold transition-colors ${form.kind === 'transfer' ? 'border border-indigo-200 bg-indigo-50 text-indigo-700' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Pindah Dana
          </button>
        </div>
        <Input label="Nominal (Rp)" type="text" inputMode="numeric" pattern="[0-9.]*" required placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: fmtMoney(e.target.value) })} />
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-slate-500">Tanggal & jam</label>
            <button type="button" onClick={setNow} className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-accent hover:bg-slate-50">
              <Clock size={14} /> Sekarang
            </button>
          </div>
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputCls} />
          </div>
        </div>
        {form.kind === 'transfer' ? (
          <>
            <Select label="Dari Akun" required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
              <option value="">Pilih akun asal...</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
            <Select label="Ke Akun" required value={form.to_account_id} onChange={(e) => setForm({ ...form, to_account_id: e.target.value })}>
              <option value="">Pilih akun tujuan...</option>
              {toOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </>
        ) : (
          <>
            <Select label="Akun (wajib)" required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
              <option value="">Pilih akun...</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
            <Select label="Kategori" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Tanpa kategori</option>
              {kindCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </>
        )}
        <Input label="Catatan (opsional)" placeholder={form.kind === 'transfer' ? 'cth: Transfer ke OVO' : 'cth: Makan siang'} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" loading={saving}>{editing ? 'Simpan Perubahan' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
  )
}
