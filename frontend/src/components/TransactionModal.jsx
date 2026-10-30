import { useEffect, useState } from 'react'
import api, { errMsg } from '../lib/api.js'
import { Button, Input, Modal, Select } from './ui.jsx'

const emptyForm = {
  kind: 'expense',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
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
        amount: editing.amount,
        date: editing.date,
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

  const submit = async (e) => {
    e.preventDefault()
    const payload = {
      kind: form.kind,
      amount: Number(form.amount),
      date: form.date,
      account_id: Number(form.account_id),
      to_account_id: form.kind === 'transfer' && form.to_account_id ? Number(form.to_account_id) : null,
      category_id: form.category_id ? Number(form.category_id) : null,
      note: form.note || null
    }
    try {
      if (editing) await api.patch(`/transactions/${editing.id}`, payload)
      else await api.post('/transactions', payload)
      onSaved && onSaved()
    } catch (e2) {
      setErr(errMsg(e2))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Transaksi' : 'Tambah Transaksi'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setKind('expense')}
            className={`rounded-lg px-2 py-2 text-sm font-medium ${form.kind === 'expense' ? 'bg-rose-600 text-white' : 'border border-slate-300 text-slate-600'}`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setKind('income')}
            className={`rounded-lg px-2 py-2 text-sm font-medium ${form.kind === 'income' ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-600'}`}
          >
            Pemasukan
          </button>
          <button
            type="button"
            onClick={() => setKind('transfer')}
            className={`rounded-lg px-2 py-2 text-sm font-medium ${form.kind === 'transfer' ? 'bg-indigo-600 text-white' : 'border border-slate-300 text-slate-600'}`}
          >
            Pindah Dana
          </button>
        </div>
        <Input label="Nominal (Rp)" type="number" min="0" step="500" required placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Input label="Tanggal" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
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
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit">{editing ? 'Simpan Perubahan' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
  )
}
