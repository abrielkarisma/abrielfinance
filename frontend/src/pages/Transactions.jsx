import { useEffect, useState } from 'react'
import { ArrowRight, Pencil, ReceiptText, Trash2 } from 'lucide-react'
import api, { errMsg, fmtIDR } from '../lib/api.js'
import { Badge, Button, Card, Modal, Select } from '../components/ui.jsx'
import TransactionModal from '../components/TransactionModal.jsx'
import { toast } from '../components/toast.jsx'

const KIND_META = {
  expense: { label: 'Pengeluaran', color: '#c4242a' },
  income: { label: 'Pemasukan', color: '#247b50' },
  transfer: { label: 'Pindah dana', color: '#5f5b52' }
}
const AMOUNT_CLASS = {
  income: 'text-up',
  expense: 'text-ink',
  transfer: 'text-sub'
}

const fmtDT = (t) => `${t.date}${t.time ? ` · ${t.time}` : ''}`

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [filters, setFilters] = useState({ month: '', kind: '', category_id: '', account_id: '' })
  const pageSize = 10
  const [page, setPage] = useState(1)
  const [totalTxs, setTotalTxs] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
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
    params.limit = pageSize
    params.offset = (page - 1) * pageSize
    api.get('/transactions', { params }).then((r) => {
      setTransactions(r.data.items)
      setTotalTxs(r.data.total)
    }).catch(() => {})
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

  }, [filters.month, filters.kind, filters.category_id, filters.account_id, page])


  useEffect(() => {
    setPage(1)
  }, [filters.month, filters.kind, filters.category_id, filters.account_id])


  useEffect(() => {
    const handler = () => loadTransactions()
    window.addEventListener('tx-changed', handler)
    return () => window.removeEventListener('tx-changed', handler)

  }, [filters.month, filters.kind, filters.category_id, filters.account_id, page])

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
    if (!deleting || deletingBusy) return
    setDeletingBusy(true)
    try {
      await api.delete(`/transactions/${deleting.id}`)
      setDeleting(null)
      loadTransactions()
      toast.success('Transaksi berhasil dihapus')
    } catch (e2) {
      toast.error(errMsg(e2))
    } finally {
      setDeletingBusy(false)
    }
  }

  const accountCell = (t) => {
    if (t.kind === 'transfer') {
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {t.account && <Badge color={t.account.color}>{t.account.name}</Badge>}
          <ArrowRight size={13} className="text-faint" aria-hidden />
          {t.to_account && <Badge color={t.to_account.color}>{t.to_account.name}</Badge>}
        </span>
      )
    }
    return t.account ? <Badge color={t.account.color}>{t.account.name}</Badge> : <span className="text-faint">–</span>
  }

  const emptyState = (
    <div className="flex flex-col items-center gap-2 py-14 text-center md:py-16">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-raised text-faint">
        <ReceiptText size={20} />
      </span>
      <p className="text-sm text-faint">Tidak ada transaksi yang cocok.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Transaksi</h1>
          <p className="mt-0.5 text-sm text-sub">{totalTxs} catatan</p>
        </div>
      </div>

      {/* Filter toolbar: tonal strip, no outlined box */}
      <div className="rounded-[20px] bg-raised p-4 dark:bg-[#1a1d18]">
        <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-wrap lg:items-end">
          <input
            type="month"
            value={filters.month}
            onChange={(e) => setFilter('month', e.target.value)}
            aria-label="Filter bulan"
            className="col-span-2 min-h-[44px] rounded-[12px] border border-control bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-accent lg:w-44"
          />
          <Select label="Jenis" value={filters.kind} onChange={(e) => setFilter('kind', e.target.value)} className="sm:w-40">
            <option value="">Semua jenis</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
            <option value="transfer">Pindah dana</option>
          </Select>
          <Select label="Akun" value={filters.account_id} onChange={(e) => setFilter('account_id', e.target.value)} className="sm:w-48">
            <option value="">Semua akun</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Select label="Kategori" value={filters.category_id} onChange={(e) => setFilter('category_id', e.target.value)} className="col-span-2 sm:col-span-1 sm:w-48">
            <option value="">Semua kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </div>

      <Card className="p-2 sm:p-3">
        {transactions.length === 0 ? (
          emptyState
        ) : (
          <>
            <ul className="space-y-1 md:hidden">
              {transactions.map((t) => (
                <li key={t.id} className="rounded-[12px] bg-raised px-3.5 py-3 dark:bg-[#1e211c]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-faint tnum">{fmtDT(t)}</span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Badge color={KIND_META[t.kind]?.color || '#8a877d'}>{KIND_META[t.kind]?.label || t.kind}</Badge>
                      {t.kind === 'transfer' ? (
                        <>
                          {t.account && <Badge color={t.account.color}>{t.account.name}</Badge>}
                          <ArrowRight size={13} className="self-center text-faint" aria-hidden />
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
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-sub">{t.note || KIND_META[t.kind]?.label || t.kind}</span>
                    <span className={`shrink-0 text-sm font-semibold tnum ${AMOUNT_CLASS[t.kind]}`}>
                      {t.kind === 'income' ? '+' : '−'}{fmtIDR(t.amount)}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-1">
                    <button onClick={() => openEdit(t)} className="flex min-h-[44px] items-center gap-1 rounded-[8px] px-2 text-xs font-medium text-sub hover:bg-active hover:text-accent" aria-label="Edit">
                      <Pencil size={14} /> Edit
                    </button>
                    <button onClick={() => setDeleting(t)} className="flex min-h-[44px] items-center gap-1 rounded-[8px] px-2 text-xs font-medium text-sub hover:bg-down-soft hover:text-down" aria-label="Hapus">
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[12px] font-normal text-faint">
                    <th className="px-3 py-2 font-normal">Tanggal</th>
                    <th className="px-3 py-2 font-normal">Jenis</th>
                    <th className="px-3 py-2 font-normal">Kategori</th>
                    <th className="px-3 py-2 font-normal">Akun</th>
                    <th className="px-3 py-2 font-normal">Catatan</th>
                    <th className="px-3 py-2 text-right font-normal tnum">Nominal</th>
                    <th className="px-3 py-2 text-right font-normal">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="rounded-[12px] hover:bg-raised">
                      <td className="whitespace-nowrap rounded-l-[12px] px-3 py-2.5 text-sub tnum">{fmtDT(t)}</td>
                      <td className="px-3 py-2.5">
                        <Badge color={KIND_META[t.kind]?.color || '#8a877d'}>{KIND_META[t.kind]?.label || t.kind}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        {t.kind === 'transfer' ? (
                          <span className="text-faint">–</span>
                        ) : t.category ? (
                          <Badge color={t.category.color}>{t.category.name}</Badge>
                        ) : (
                          <span className="text-faint">–</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">{accountCell(t)}</td>
                      <td className="max-w-40 truncate px-3 py-2.5 text-sub">{t.note || '–'}</td>
                      <td className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold tnum ${AMOUNT_CLASS[t.kind]}`}>
                        {t.kind === 'income' ? '+' : '−'}{fmtIDR(t.amount)}
                      </td>
                      <td className="whitespace-nowrap rounded-r-[12px] px-3 py-2.5 text-right">
                        <button onClick={() => openEdit(t)} className="rounded-[8px] p-2.5 text-faint transition-colors hover:bg-active hover:text-accent" aria-label="Edit">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setDeleting(t)} className="ml-1 rounded-[8px] p-2.5 text-faint transition-colors hover:bg-down-soft hover:text-down" aria-label="Hapus">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {totalTxs > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-faint tnum">
            Menampilkan {Math.min(totalTxs, (page - 1) * pageSize + 1)}–{Math.min(page * pageSize, totalTxs)} dari {totalTxs}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(p - 1, 1))}>Sebelumnya</Button>
            <span className="text-sm font-medium text-sub tnum">Halaman {page}</span>
            <Button variant="outline" disabled={page * pageSize >= totalTxs} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
          </div>
        </div>
      )}

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSaved={() => {
          setModalOpen(false)
          loadTransactions()
        }}
      />

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Hapus transaksi">
        <p className="text-sm text-sub">Yakin mau menghapus transaksi ini?</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
          <Button variant="danger" loading={deletingBusy} onClick={confirmDelete}>Hapus</Button>
        </div>
      </Modal>
    </div>
  )
}
