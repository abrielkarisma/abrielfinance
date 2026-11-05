import { useCallback, useEffect, useState } from 'react'
import api, { errMsg, fmtIDR, fmtMoney, parseMoney } from '../lib/api.js'
import { Button, Card, ColorPicker, Input, Modal, Select } from '../components/ui.jsx'
import { Check, Copy, CreditCard, Landmark, Pencil, Trash2 } from 'lucide-react'
import { useHideBal } from '../context/BalContext.jsx'
import { toast } from '../components/toast.jsx'

const TYPE_LABEL = { bank: 'Bank', ewallet: 'E-Wallet', cash: 'Tunai' }
const PALETTE = ['#b45309', '#1d5fb6', '#be408c', '#3f6212', '#c4242a', '#2a8798', '#d97706', '#247b50', '#57534e', '#0a3a80']
const emptyForm = { name: '', type: 'bank', color: PALETTE[0], opening_balance: '' }
const emptyNum = { name: '', holder: '', number: '' }

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

  const [numbers, setNumbers] = useState([])
  const [numsOpen, setNumsOpen] = useState(false)
  const [numEdit, setNumEdit] = useState(null)
  const [numForm, setNumForm] = useState(emptyNum)
  const [numErr, setNumErr] = useState('')
  const [numSaving, setNumSaving] = useState(false)
  const [deletingNum, setDeletingNum] = useState(null)

  const { hide } = useHideBal()

  const load = useCallback(() => {
    api.get('/accounts').then((r) => setAccounts(r.data)).catch(() => {})
    api.get('/reports/accounts').then((r) => {
      const m = {}
      r.data.accounts.forEach((a) => { m[a.account.id] = a })
      setBalances(m)
    }).catch(() => {})
  }, [])

  const loadNumbers = useCallback(() => {
    api.get('/account-numbers').then((r) => setNumbers(r.data)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (numsOpen) loadNumbers() }, [numsOpen, loadNumbers])

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

  const openNums = () => {
    setNumsOpen(true)
    setNumEdit(null)
    setNumForm(emptyNum)
    setNumErr('')
  }
  const startAddNum = () => { setNumEdit('new'); setNumForm(emptyNum); setNumErr('') }
  const startEditNum = (n) => { setNumEdit(n); setNumForm({ name: n.name, holder: n.holder, number: n.number }); setNumErr('') }
  const cancelNumForm = () => { setNumEdit(null); setNumForm(emptyNum); setNumErr('') }

  const submitNum = async (e) => {
    e.preventDefault()
    if (numSaving) return
    setNumSaving(true)
    try {
      if (numEdit && numEdit !== 'new') await api.patch(`/account-numbers/${numEdit.id}`, numForm)
      else await api.post('/account-numbers', numForm)
      toast.success(numEdit && numEdit !== 'new' ? 'No rekening diperbarui' : 'No rekening disimpan')
      setNumEdit(null)
      setNumForm(emptyNum)
      loadNumbers()
    } catch (e2) {
      setNumErr(errMsg(e2))
      toast.error(errMsg(e2))
    } finally {
      setNumSaving(false)
    }
  }

  const confirmDeleteNum = async () => {
    if (!deletingNum) return
    try {
      await api.delete(`/account-numbers/${deletingNum.id}`)
      setDeletingNum(null)
      loadNumbers()
      toast.success('No rekening dihapus')
    } catch (e2) {
      setDeletingNum(null)
      toast.error(errMsg(e2))
    }
  }

  const copyNum = async (n) => {
    const text = [n.name, n.holder, n.number].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast.success('No rekening disalin')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        toast.success('No rekening disalin')
      } catch {
        toast.error('Gagal menyalin')
      }
    }
  }

  const balanceOf = (id) => balances[id]?.balance ?? 0
  const fmtBal = (n) => (hide ? 'Rp ••••••' : fmtIDR(n))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Rekening</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={openNums}><CreditCard size={16} /> Daftar rekening</Button>
          <Button onClick={openAdd}><Landmark size={16} /> Tambah akun</Button>
        </div>
      </div>

      <Card className="p-2 sm:p-3">
        <ul className="space-y-1">
          {accounts.length === 0 && (
            <li className="py-8 text-center text-sm text-faint">Belum ada akun. Tambah akun bank, e-wallet, atau tunai.</li>
          )}
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-raised px-3.5 py-3 dark:bg-[#1e211c]">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink">{a.name}</div>
                  <div className="text-xs text-faint tnum">{TYPE_LABEL[a.type] || a.type} · Saldo awal {fmtIDR(a.opening_balance)}</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className={`mr-1 text-sm font-semibold tnum ${balanceOf(a.id) >= 0 ? 'text-ink' : 'text-down'}`}>
                  {fmtBal(balanceOf(a.id))}
                </span>
                <button className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[8px] px-2 text-xs font-medium text-accent hover:bg-active" onClick={() => openEdit(a)}>Edit</button>
                <button className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[8px] px-2 text-xs font-medium text-down hover:bg-down-soft" onClick={() => setDeleting(a)}>Hapus</button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit akun' : 'Tambah akun'}
        subtitle={editing ? 'Perbarui detail rekening.' : 'Rekening bank, e-wallet, atau tunai.'}
        icon={<Landmark size={22} strokeWidth={2} />}
      >
        <form onSubmit={submit} className="space-y-4">
          <Input label="Nama akun" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth: BCA, Mandiri, OVO" />
          <Select label="Jenis" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="bank">Bank</option>
            <option value="ewallet">E-Wallet</option>
            <option value="cash">Tunai</option>
          </Select>
          <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
          <Input label="Saldo awal" prefix="Rp" type="text" inputMode="numeric" pattern="[0-9.]*" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: fmtMoney(e.target.value) })} />
          {err && <p className="text-sm text-down">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving}><Check size={16} /> Simpan</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Hapus akun" subtitle="Tindakan ini tidak bisa dibatalkan." icon={<Trash2 size={22} strokeWidth={2} />}>
        <p className="text-sm text-sub">
          Yakin mau menghapus akun <b>{deleting?.name}</b>? Akun yang masih punya transaksi tidak bisa dihapus.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
          <Button variant="danger" loading={deletingBusy} onClick={confirmDelete}>Hapus</Button>
        </div>
      </Modal>

      <Modal open={numsOpen} onClose={() => setNumsOpen(false)} title="Daftar no rekening" subtitle="Simpan nomor rekening agar gampang disalin." icon={<CreditCard size={22} strokeWidth={2} />}>
        {numEdit ? (
          <form onSubmit={submitNum} className="space-y-4">
            <Input label="Nama rekening" required value={numForm.name} onChange={(e) => setNumForm({ ...numForm, name: e.target.value })} placeholder="cth: BCA, Mandiri, DANA" />
            <Input label="Atas nama" required value={numForm.holder} onChange={(e) => setNumForm({ ...numForm, holder: e.target.value })} placeholder="cth: Teguh S. A. Karisma" />
            <Input label="Nomor rekening" required value={numForm.number} onChange={(e) => setNumForm({ ...numForm, number: e.target.value })} placeholder="cth: 1234567890" />
            {numErr && <p className="text-sm text-down">{numErr}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={cancelNumForm}>Batal</Button>
              <Button type="submit" loading={numSaving}><Check size={16} /> Simpan</Button>
            </div>
          </form>
        ) : (
          <>
            <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {numbers.length === 0 && (
                <li className="py-6 text-center text-sm text-faint">Belum ada nomor rekening tersimpan.</li>
              )}
              {numbers.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-raised px-3 py-2.5 dark:bg-[#1e211c]">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{n.name}</div>
                    <div className="truncate text-xs text-sub">{n.holder} · <span className="font-medium tnum">{n.number}</span></div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button aria-label="Salin" title="Salin" onClick={() => copyNum(n)} className="flex h-11 w-11 items-center justify-center rounded-[8px] text-sub transition-colors hover:bg-active hover:text-accent">
                      <Copy size={16} />
                    </button>
                    <button aria-label="Edit" title="Edit" onClick={() => startEditNum(n)} className="flex h-11 w-11 items-center justify-center rounded-[8px] text-sub transition-colors hover:bg-active hover:text-ink">
                      <Pencil size={16} />
                    </button>
                    <button aria-label="Hapus" title="Hapus" onClick={() => setDeletingNum(n)} className="flex h-11 w-11 items-center justify-center rounded-[8px] text-sub transition-colors hover:bg-down-soft hover:text-down">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-end">
              <Button onClick={startAddNum}><Check size={16} /> Tambah no rekening</Button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={!!deletingNum} onClose={() => setDeletingNum(null)} title="Hapus no rekening" subtitle="Tindakan ini tidak bisa dibatalkan." icon={<Trash2 size={22} strokeWidth={2} />}>
        <p className="text-sm text-sub">
          Yakin mau hapus nomor rekening <b>{deletingNum?.name}</b>?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeletingNum(null)}>Batal</Button>
          <Button variant="danger" onClick={confirmDeleteNum}>Hapus</Button>
        </div>
      </Modal>
    </div>
  )
}
