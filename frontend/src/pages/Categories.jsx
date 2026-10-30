import { useCallback, useEffect, useState } from 'react'
import api, { errMsg } from '../lib/api.js'
import { Button, Card, Input, Modal } from '../components/ui.jsx'

const COLORS = ['#f97316', '#3b82f6', '#ec4899', '#a855f7', '#ef4444', '#14b8a6', '#f59e0b', '#22c55e', '#84cc16', '#64748b']
const KIND_LABEL = { income: 'Pemasukan', expense: 'Pengeluaran' }

const emptyForm = { name: '', kind: 'expense', color: '#f97316' }

export default function Categories() {
  const [cats, setCats] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [err, setErr] = useState('')
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(() => {
    api.get('/categories').then((r) => setCats(r.data)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = (kind) => {
    setEditing(null)
    setForm({ ...emptyForm, kind })
    setErr('')
    setModalOpen(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({ name: c.name, kind: c.kind, color: c.color })
    setErr('')
    setModalOpen(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      if (editing) await api.patch(`/categories/${editing.id}`, form)
      else await api.post('/categories', form)
      setModalOpen(false)
      load()
    } catch (e) {
      setErr(errMsg(e))
    }
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/categories/${deleting.id}`)
      setDeleting(null)
      load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const renderGroup = (kind) => {
    const group = cats.filter((c) => c.kind === kind)
    return (
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">{KIND_LABEL[kind]}</h2>
          <Button size="sm" className="px-3 py-1.5" onClick={() => openAdd(kind)}>+ Tambah</Button>
        </div>
        {group.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Belum ada kategori.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {group.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </span>
                <span className="flex gap-3 text-xs">
                  <button className="text-emerald-600 hover:underline" onClick={() => openEdit(c)}>Edit</button>
                  <button className="text-rose-600 hover:underline" onClick={() => setDeleting(c)}>Hapus</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kategori</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {renderGroup('expense')}
        {renderGroup('income')}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Kategori' : 'Tambah Kategori'}>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Nama Kategori" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-600">Warna</span>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
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
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Hapus Kategori">
        <p className="text-sm text-slate-600">
          Yakin mau menghapus kategori <b>{deleting?.name}</b>? Transaksi yang memakainya akan jadi "Tanpa kategori".
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
          <Button variant="danger" onClick={confirmDelete}>Hapus</Button>
        </div>
      </Modal>
    </div>
  )
}
