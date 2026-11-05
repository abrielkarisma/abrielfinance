import { useCallback, useEffect, useState } from 'react'
import api, { errMsg, fmtIDR } from '../lib/api.js'
import { Button, Card, ColorPicker, Input, Modal } from '../components/ui.jsx'
import { Check, PiggyBank, Plus, Tags, Trash2 } from 'lucide-react'
import { toast } from '../components/toast.jsx'

const COLORS = ['#b45309', '#1d5fb6', '#be408c', '#3f6212', '#c4242a', '#2a8798', '#d97706', '#247b50', '#57534e', '#0a3a80']
const KIND_LABEL = { income: 'Pemasukan', expense: 'Pengeluaran' }

const emptyForm = { name: '', kind: 'expense', color: '#b45309' }

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
      <Card className="p-2 sm:p-3">
        <div className="mb-2 flex min-h-[44px] items-center justify-between px-1">
          <h2>{KIND_LABEL[kind]}</h2>
          <button className="flex min-h-[44px] items-center gap-1 rounded-[8px] px-2 text-xs font-semibold text-accent hover:bg-raised" onClick={() => openAdd(kind)}><Plus size={14} /> Tambah</button>
        </div>
        {group.length === 0 ? (
          <p className="py-6 text-center text-sm text-faint">Belum ada kategori.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {group.map((c) => (
              <div key={c.id} className="rounded-[12px] bg-raised px-3 py-2.5 dark:bg-[#1e211c]">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center text-xs font-medium">
                    {c.kind === 'expense' && (
                      <button className="flex min-h-[44px] items-center rounded-[8px] px-2 text-accent hover:bg-active" onClick={() => openBudget(c)}>Budget</button>
                    )}
                    <button className="flex min-h-[44px] items-center rounded-[8px] px-2 text-sub hover:bg-active hover:text-ink" onClick={() => openEdit(c)}>Edit</button>
                    <button className="flex min-h-[44px] items-center rounded-[8px] px-2 text-sub hover:bg-down-soft hover:text-down" onClick={() => setDeleting(c)}>Hapus</button>
                  </span>
                </div>
                {c.kind === 'expense' && budgets[c.id] && (
                  <div className="mt-1 flex items-center gap-1.5 pl-5">
                    <PiggyBank size={12} className="shrink-0 text-sub" />
                    <span className="tnum text-[11px] font-medium text-sub"
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
    <div className="space-y-4">
      <h1>Kategori</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {renderGroup('expense')}
        {renderGroup('income')}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit kategori' : 'Tambah kategori'}
        subtitle={editing ? 'Perbarui nama dan warna kategori.' : 'Kelompokkan dan warnai transaksi.'}
        icon={<Tags size={22} strokeWidth={2} />}
      >
        <form onSubmit={submit} className="space-y-4">
          <Input label="Nama kategori" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
          {err && <p className="text-sm text-down">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving}><Check size={16} /> Simpan</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!budgetCat} onClose={() => setBudgetCat(null)} title="Atur budget kategori"
        subtitle={budgetCat ? `Nilai budget bulanan untuk “${budgetCat.name}”.` : ''}
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

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Hapus kategori" subtitle="Tindakan ini tidak bisa dibatalkan." icon={<Trash2 size={22} strokeWidth={2} />}>
        <p className="text-sm text-sub">
          Yakin mau menghapus kategori <b>{deleting?.name}</b>? Transaksi yang memakainya akan jadi “Tanpa kategori”.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
          <Button variant="danger" loading={deletingBusy} onClick={confirmDelete}>Hapus</Button>
        </div>
      </Modal>
    </div>
  )
}
