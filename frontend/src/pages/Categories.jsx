import { useCallback, useEffect, useState } from 'react'
import api, { errMsg, fmtIDR } from '../lib/api.js'
import { Button, Card, ColorPicker, Input, Modal } from '../components/ui.jsx'
import { Check, PiggyBank, Tags, Trash2 } from 'lucide-react'
import { toast } from '../components/toast.jsx'

const COLORS = ['#f97316', '#3b82f6', '#ec4899', '#a855f7', '#ef4444', '#14b8a6', '#f59e0b', '#22c55e', '#84cc16', '#64748b']
const KIND_LABEL = { income: 'Pemasukan', expense: 'Pengeluaran' }

const emptyForm = { name: '', kind: 'expense', color: '#f97316' }

export default function Categories() {
  const [cats, setCats] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [budgets, setBudgets] = useState({})
  const [budgetCat, setBudgetCat] = useState(null)
  const [budgetForm, setBudgetForm] = useState('')
  const [budgetSaving, setBudgetSaving] = useState(false)

  const load = useCallback(() => {
    api.get('/categories').then((r) => setCats(r.data)).catch(() => {})
    api.get('/budgets').then((r) => {
      const m = {}
      r.data.forEach((b) => { m[b.category.id] = b })
      setBudgets(m)
    }).catch(() => {})
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
    if (saving) return
    setSaving(true)
    try {
      if (editing) await api.patch(`/categories/${editing.id}`, form)
      else await api.post('/categories', form)
      toast.success(editing ? 'Kategori berhasil diperbarui' : 'Kategori berhasil ditambahkan')
      setModalOpen(false)
      load()
    } catch (e) {
      setErr(errMsg(e))
      toast.error(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting || deletingBusy) return
    setDeletingBusy(true)
    try {
      await api.delete(`/categories/${deleting.id}`)
      setDeleting(null)
      load()
      toast.success('Kategori berhasil dihapus')
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setDeletingBusy(false)
    }
  }

  const openBudget = (c) => {
    const existing = budgets[c.id]
    setBudgetCat(c)
    setBudgetForm(existing ? String(existing.amount) : '')
  }

  const saveBudget = async () => {
    if (!budgetCat || budgetSaving) return
    const amount = parseFloat(String(budgetForm).replace(/\./g, '').replace(/,/g, '.'))
    if (!(amount >= 0)) {
      toast.error('Nominal budget tidak valid')
      return
    }
    setBudgetSaving(true)
    try {
      const existing = budgets[budgetCat.id]
      if (existing) await api.patch(`/budgets/${existing.id}`, { amount })
      else await api.post('/budgets', { category_id: budgetCat.id, amount })
      toast.success('Budget kategori tersimpan')
      setBudgetCat(null)
      load()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBudgetSaving(false)
    }
  }

  const removeBudget = async () => {
    const existing = budgets[budgetCat?.id]
    if (!existing || budgetSaving) return
    setBudgetSaving(true)
    try {
      await api.delete(`/budgets/${existing.id}`)
      toast.success('Budget dihapus')
      setBudgetCat(null)
      load()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBudgetSaving(false)
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
              <div key={c.id} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-xs">
                    {c.kind === 'expense' && (
                      <button className="text-sky-600 hover:underline" onClick={() => openBudget(c)}>Budget</button>
                    )}
                    <button className="text-emerald-600 hover:underline" onClick={() => openEdit(c)}>Edit</button>
                    <button className="text-rose-600 hover:underline" onClick={() => setDeleting(c)}>Hapus</button>
                  </span>
                </div>
                {c.kind === 'expense' && budgets[c.id] && (
                  <div className="mt-1.5 flex items-center gap-1.5 pl-5">
                    <PiggyBank size={12} className="shrink-0 text-sky-600 dark:text-sky-400" />
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
                      title="Budget bulanan">Budget {fmtIDR(budgets[c.id].amount)}</span>
                  </div>
                )}
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Kategori' : 'Tambah Kategori'}
        subtitle={editing ? 'Perbarui nama & warna kategori.' : 'Kelompokkan dan warnai transaksi.'}
        icon={<Tags size={22} strokeWidth={2} />}
      >
        <form onSubmit={submit} className="space-y-4">
          <Input label="Nama Kategori" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving}><Check size={16} /> Simpan</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!budgetCat} onClose={() => setBudgetCat(null)} title="Atur Budget Kategori"
        subtitle={budgetCat ? `Nilai budget bulanan untuk "${budgetCat.name}".` : ''}
        icon={<PiggyBank size={22} strokeWidth={2} />}>
        <div className="space-y-4">
          <Input label="Budget per bulan (Rp)" value={budgetForm}
            onChange={(e) => setBudgetForm(e.target.value)} placeholder="cth. 500000" />
          <div className="flex justify-end gap-2 pt-2">
            {budgets[budgetCat?.id] && (
              <Button type="button" variant="outline" onClick={removeBudget} loading={budgetSaving}>Hapus</Button>
            )}
            <Button type="button" variant="outline" onClick={() => setBudgetCat(null)}>Batal</Button>
            <Button type="button" onClick={saveBudget} loading={budgetSaving}><Check size={16} /> Simpan</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Hapus Kategori" subtitle="Tindakan ini tidak bisa dibatalkan." icon={<Trash2 size={22} strokeWidth={2} />}>
        <p className="text-sm text-slate-600">
          Yakin mau menghapus kategori <b>{deleting?.name}</b>? Transaksi yang memakainya akan jadi "Tanpa kategori".
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
          <Button variant="danger" loading={deletingBusy} onClick={confirmDelete}>Hapus</Button>
        </div>
      </Modal>
    </div>
  )
}
