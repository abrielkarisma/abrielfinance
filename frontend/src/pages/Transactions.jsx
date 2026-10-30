import { useEffect, useState } from 'react'
import api, { errMsg, fmtIDR } from '../lib/api.js'
import { Badge, Button, Card, Input, Modal, Select } from '../components/ui.jsx'
import TransactionModal from '../components/TransactionModal.jsx'

const KIND_META = {
  expense: { label: 'Pengeluaran', color: '#f43f5e' },
  income: { label: 'Pemasukan', color: '#10b981' },
  transfer: { label: 'Pindah Dana', color: '#6366f1' }
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [filters, setFilters] = useState({ month: '', kind: '', category_id: '', account_id: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [err, setErr] = useState('')

  const loadTransactions = () => {
    const params = {}
    if (filters.month) {
      const [y, m] = filters.month.split('-').map(Number)
      params.start = `${y}-${String(m).padStart(2, '0')}-01`
      params.end = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    }
    if (filters.kind) params.kind = filters.kind
    if (filters.category_id) params.category_id = filters.category_id
    if (filters.account_id) params.account_id = filters.account_id
    api.get('/transactions', { params }).then((r) => setTransactions(r.data)).catch(() => {})
  }

  const loadCategories = (kind) => {
    api.get('/categories', { params: kind ? { kind } : {} }).then((r) => setCategories(r.data)).catch(() => {})
  }

  const loadAccounts = () => {
    api.get('/accounts').then((r) => setAccounts(r.data)).catch(() => {})
  }

  useEffect(() => {
    loadCategories()
    loadAccounts()
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [filters.month, filters.kind, filters.category_id, filters.account_id])

  // reload when a transaction is created from the global navbar FAB
  useEffect(() => {
    const handler = () => loadTransactions()
    window.addEventListener('tx-changed', handler)
    return () => window.removeEventListener('tx-changed', handler)
  }, [filters.month, filters.kind, filters.category_id, filters.account_id])

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }))

  const openAdd = () => {
    setEditing(null)
    setErr('')
    setModalOpen(true)
  }

  const openEdit = (t) => {
    setEditing(t)
    setErr('')
    setModalOpen(true)
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/transactions/${deleting.id}`)
      setDeleting(null)
      loadTransactions()
    } catch (e2) {
      alert(errMsg(e2))
    }
  }

  const accountCell = (t) => {
    if (t.kind === 'transfer') {
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {t.account && <Badge color={t.account.color}>{t.account.name}</Badge>}
          <span className="text-slate-400">→</span>
          {t.to_account && <Badge color={t.to_account.color}>{t.to_account.name}</Badge>}
        </span>
      )
    }
    return t.account ? <Badge color={t.account.color}>{t.account.name}</Badge> : <span className="text-slate-400">—</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Transaksi</h1>
        <Button onClick={openAdd}>+ Tambah Transaksi</Button>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-4 lg:flex lg:flex-wrap lg:items-end">
          <input
            type="month"
            value={filters.month}
            onChange={(e) => setFilter('month', e.target.value)}
            className="col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 lg:w-44"
          />
          <Select label="Jenis" value={filters.kind} onChange={(e) => setFilter('kind', e.target.value)} className="sm:w-40">
            <option value="">Semua Jenis</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
            <option value="transfer">Pindah Dana</option>
          </Select>
          <Select label="Akun" value={filters.account_id} onChange={(e) => setFilter('account_id', e.target.value)} className="sm:w-48">
            <option value="">Semua Akun</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Select label="Kategori" value={filters.category_id} onChange={(e) => setFilter('category_id', e.target.value)} className="col-span-2 sm:col-span-1 sm:w-48">
            <option value="">Semua Kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </Card>

      <Card className="p-0 md:p-5">
        {transactions.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400 md:py-16">Tidak ada transaksi yang cocok.</p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {transactions.map((t) => (
                <li key={t.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">{t.date}</span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {t.kind === 'transfer' ? (
                        <>
                          {t.account && <Badge color={t.account.color}>{t.account.name}</Badge>}
                          <span className="text-xs text-slate-400">→</span>
                          {t.to_account && <Badge color={t.to_account.color}>{t.to_account.name}</Badge>}
                        </>
                      ) : (
                        <>
                          {t.category && <Badge color={t.category.color}>{t.category.name}</Badge>}
                          {t.account && <Badge color={t.account.color}>{t.account.name}</Badge>}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-slate-600">{t.note || KIND_META[t.kind]?.label || t.kind}</span>
                    <span className={`text-sm font-semibold ${t.kind === 'income' ? 'text-emerald-600' : t.kind === 'expense' ? 'text-rose-600' : 'text-indigo-600'}`}>
                      {t.kind === 'income' ? '+' : '−'}{fmtIDR(t.amount)}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-3">
                    <button onClick={() => openEdit(t)} className="text-xs text-emerald-600 hover:underline">Edit</button>
                    <button onClick={() => setDeleting(t)} className="text-xs text-rose-600 hover:underline">Hapus</button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto px-5 pb-2 md:block md:px-0 md:pb-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3 font-medium">Tanggal</th>
                    <th className="py-2 pr-3 font-medium">Jenis</th>
                    <th className="py-2 pr-3 font-medium">Kategori</th>
                    <th className="py-2 pr-3 font-medium">Akun</th>
                    <th className="py-2 pr-3 font-medium">Catatan</th>
                    <th className="py-2 text-right font-medium">Nominal</th>
                    <th className="py-2 pl-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-3 text-slate-500">{t.date}</td>
                      <td className="py-2.5 pr-3">
                        <Badge color={KIND_META[t.kind]?.color || '#94a3b8'}>{KIND_META[t.kind]?.label || t.kind}</Badge>
                      </td>
                      <td className="py-2.5 pr-3">
                        {t.kind === 'transfer' ? (
                          <span className="text-slate-400">—</span>
                        ) : t.category ? (
                          <Badge color={t.category.color}>{t.category.name}</Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">{accountCell(t)}</td>
                      <td className="max-w-40 truncate py-2.5 pr-3 text-slate-600">{t.note || '—'}</td>
                      <td className={`py-2.5 text-right font-semibold ${t.kind === 'income' ? 'text-emerald-600' : t.kind === 'expense' ? 'text-rose-600' : 'text-indigo-600'}`}>
                        {t.kind === 'income' ? '+' : '−'}{fmtIDR(t.amount)}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pl-3 text-right">
                        <button onClick={() => openEdit(t)} className="text-emerald-600 hover:underline">Edit</button>
                        <span className="mx-2 text-slate-300">|</span>
                        <button onClick={() => setDeleting(t)} className="text-rose-600 hover:underline">Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSaved={() => {
          setModalOpen(false)
          loadTransactions()
        }}
      />

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Hapus Transaksi">
        <p className="text-sm text-slate-600">Yakin mau menghapus transaksi ini?</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
          <Button variant="danger" onClick={confirmDelete}>Hapus</Button>
        </div>
      </Modal>
    </div>
  )
}
