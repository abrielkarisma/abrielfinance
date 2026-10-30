import { useCallback, useEffect, useState } from 'react'
import api, { errMsg, fmtIDR } from '../lib/api.js'
import { Badge, Button, Card, Input, Modal, Select } from '../components/ui.jsx'

const KIND_LABEL = { income: 'Pemasukan', expense: 'Pengeluaran' }

const emptyForm = { kind: 'expense', amount: '', date: '', category_id: '', note: '' }

export default function Transactions() {
  const [txs, setTxs] = useState([])
  const [cats, setCats] = useState([])
  const [filters, setFilters] = useState({ month: new Date().toISOString().slice(0, 7), kind: '', category_id: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [err, setErr] = useState('')
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(() => {
    const params = {}
    if (filters.month) {
      const [y, m] = filters.month.split('-').map(Number)
      params.start = `${y}-${String(m).padStart(2, '0')}-01`
      params.end = `${y}-${String(m).padStart(2, '0')}-28`
    }
    if (filters.kind) params.kind = filters.kind
    if (filters.category_id) params.category_id = filters.category_id
    api.get('/transactions', { params }).then((r) => setTxs(r.data)).catch(() => {})
  }, [filters])

  const loadCats = useCallback(() => {
    api.get('/categories').then((r) => setCats(r.data)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadCats() }, [loadCats])

  const openAdd = () => {
    const now = new Date()
    setEditing(null)
    setForm({ ...emptyForm, date: now.toISOString().slice(0, 10), kind: 'expense' })
    setErr('')
    setModalOpen(true)
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({ kind: t.kind, amount: t.amount, date: t.date, category_id: t.category_id ?? '', note: t.note || '' })
    setErr('')
    setModalOpen(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    const payload = {
      kind: form.kind,
      amount: Number(form.amount),
      date: form.date,
      note: form.note || null,
      category_id: form.category_id ? Number(form.category_id) : null
    }
    try {
      if (editing) await api.patch(`/transactions/${editing.id}`, payload)
      else await api.post('/transactions', payload)
      setModalOpen(false)
      load()
    } catch (e) {
      setErr(errMsg(e))
    }
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/transactions/${deleting.id}`)
      setDeleting(null)
      load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const kindCats = cats.filter((c) => c.kind === form.kind)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Transaksi</h1>
        <Button onClick={openAdd}>+ Tambah Transaksi</Button>
      </div>

      <Card className="flex flex-wrap items-end gap-4">
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-600">Bulan</span>
          <input type="month" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        </div>
        <Select label="Jenis" value={filters.kind} onChange={(e) => setFilters({ ...filters, kind: e.target.value })} className="w-40">
          <option value="">Semua</option>
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
        </Select>
        <Select label="Kategori" value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value })} className="w-48">
          <option value="">Semua</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Card>

      <Card className="p-0 overflow-hidden">
        {txs.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">Tidak ada transaksi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Catatan</th>
                  <th className="px-4 py-3 text-right">Nominal</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {txs.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{t.date}</td>
                    <td className="px-4 py-3">
                      {t.category ? <Badge color={t.category.color}>{t.category.name}</Badge> : <Badge color="#94a3b8">Tanpa</Badge>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.note || <span className="text-slate-400">—</span>}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${t.kind === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.kind === 'income' ? '+' : '−'}{fmtIDR(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-emerald-600 hover:underline" onClick={() => openEdit(t)}>Edit</button>
                      <span className="mx-2 text-slate-300">|</span>
                      <button className="text-rose-600 hover:underline" onClick={() => setDeleting(t)}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Transaksi' : 'Tambah Transaksi'}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {['expense', 'income'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setForm({ ...form, kind: k, category_id: '' })}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${form.kind === k ? (k === 'income' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-500 bg-rose-50 text-rose-700') : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <Input label="Nominal (Rp)" type="number" min="0" step="1000" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Tanggal" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select label="Kategori" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">Tanpa kategori</option>
            {kindCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Catatan" placeholder="Opsional" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Hapus Transaksi">
        <p className="text-sm text-slate-600">
          Yakin mau menghapus transaksi <b>{fmtIDR(deleting?.amount)}</b> ({deleting?.date})? Tindakan ini tidak bisa dibatalkan.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
          <Button variant="danger" onClick={confirmDelete}>Hapus</Button>
        </div>
      </Modal>
    </div>
  )
}
