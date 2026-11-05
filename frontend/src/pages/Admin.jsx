import { useCallback, useEffect, useState } from 'react'
import api, { errMsg } from '../lib/api.js'
import { Avatar } from './Login.jsx'
import { Button, Card, Input, Modal } from '../components/ui.jsx'
import { ColorPicker, PALETTE } from '../components/ui.jsx'
import { toast } from '../components/toast.jsx'

const findRupiah = (n) => 'Rp ' + (Math.round(n || 0)).toLocaleString('id-ID')

export default function Admin() {
  const [profiles, setProfiles] = useState([])
  const [filter, setFilter] = useState('semua') // semua | aktif | arsip
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/profiles')
      setProfiles(data)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', avatar_color: PALETTE[1] })
  const [busy, setBusy] = useState(false)

  const [showEdit, setShowEdit] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', avatar_color: PALETTE[1] })
  const [editBusy, setEditBusy] = useState(false)

  const [detailTarget, setDetailTarget] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailStats, setDetailStats] = useState(null)

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.post('/admin/profiles', { ...form, email: form.email.trim() || undefined })
      toast.success(`Profil "${form.name}" dibuat`)
      setShowCreate(false)
      setForm({ name: '', email: '', avatar_color: PALETTE[1] })
      load()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setEditBusy(true)
    try {
      await api.patch(`/admin/profiles/${editTarget.id}`, { ...editForm, email: editForm.email.trim() || undefined })
      toast.success('Profil diperbarui')
      setShowEdit(false)
      setEditTarget(null)
      load()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setEditBusy(false)
    }
  }

  const toggleRole = async (p) => {
    const makeAdmin = !p.is_admin
    if (!window.confirm(makeAdmin ? `Jadikan "${p.name}" sebagai admin?` : `Turunkan "${p.name}" dari admin?`)) return
    try {
      await api.patch(`/admin/profiles/${p.id}/role`, { is_admin: makeAdmin })
      toast.success(`"${p.name}" ${makeAdmin ? 'kini admin' : 'bukan admin lagi'}`)
      load()
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  const toggleArchive = async (p) => {
    try {
      if (p.archived) {
        await api.post(`/admin/profiles/${p.id}/unarchive`)
        toast.success(`"${p.name}" dipulihkan`)
      } else {
        if (!window.confirm(`Arsipkan "${p.name}"? Data tetap ada, tapi login-nya nonaktif.`)) return
        await api.post(`/admin/profiles/${p.id}/archive`)
        toast.success(`"${p.name}" diarsipkan`)
      }
      load()
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  const openDetail = async (p) => {
    setDetailTarget(p)
    setDetailLoading(true)
    setDetailStats(null)
    try {
      const { data } = await api.get(`/admin/profiles/${p.id}`)
      setDetailStats(data.stats || {})
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setDetailLoading(false)
    }
  }

  const remove = async (p) => {
    if (!window.confirm(`Hapus profil "${p.name}"? Semua datanya ikut terhapus.`)) return
    try {
      await api.delete(`/admin/profiles/${p.id}`)
      toast.success(`Profil "${p.name}" dihapus`)
      load()
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  const visible = profiles.filter((p) => {
    if (filter === 'aktif') return !p.archived
    if (filter === 'arsip') return p.archived
    return true
  })

  const nAdmin = profiles.filter((p) => p.is_admin).length
  const nArsip = profiles.filter((p) => p.archived).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Super admin</h1>
          <p className="mt-0.5 text-sm text-sub">Kelola profil dan peran user. Hanya admin.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Profil baru</Button>
      </div>

      {/* Blok 3: statistik ringkas */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-[13px] text-sub">Total profil</p>
          <p className="mt-1 text-2xl font-semibold text-ink tnum">{profiles.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[13px] text-sub">Admin</p>
          <p className="mt-1 text-2xl font-semibold text-warning tnum">{nAdmin}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[13px] text-sub">Diarsipkan</p>
          <p className="mt-1 text-2xl font-semibold text-sub tnum">{nArsip}</p>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5">
        {[['semua', 'Semua'], ['aktif', 'Aktif'], ['arsip', 'Diarsipkan']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            aria-pressed={filter === k}
            className={`flex min-h-[44px] items-center rounded-full px-4 text-xs font-semibold transition-colors ${
              filter === k ? 'chip-active' : 'bg-raised text-sub hover:bg-active dark:bg-[#1e211c]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card><span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" /></Card>
      ) : (
        <Card className="space-y-1 p-2 sm:p-3">
          {visible.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-raised px-3.5 py-3 dark:bg-[#1e211c]">
              <Avatar p={p} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-ink">{p.name}</span>
                  {p.is_admin && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">Admin</span>}
                  {p.archived && <span className="rounded-full bg-active px-2 py-0.5 text-[10px] font-bold text-sub">Arsip</span>}
                </div>
                <span className="block truncate text-xs text-faint">
                  {p.email || 'Belum ada email'} · bergabung {p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'}
                </span>
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                <Button variant="outline" onClick={() => openDetail(p)}>Detail</Button>
                <Button variant="outline" onClick={() => { setEditTarget(p); setEditForm({ name: p.name, email: p.email || '', avatar_color: p.avatar_color }); setShowEdit(true) }}>Ubah</Button>
                <Button variant="outline" onClick={() => toggleRole(p)}>{p.is_admin ? 'Turunkan' : 'Jadikan admin'}</Button>
                <Button variant="outline" onClick={() => toggleArchive(p)}>{p.archived ? 'Pulihkan' : 'Arsipkan'}</Button>
                <Button variant="danger" onClick={() => remove(p)}>Hapus</Button>
              </div>
            </div>
          ))}
          {visible.length === 0 && <p className="py-6 text-center text-sm text-faint">Tidak ada profil.</p>}
        </Card>
      )}

      {/* Modal buat profil baru (tanpa PIN) */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Buat profil baru">
        <form onSubmit={create} className="space-y-4">
          <Input label="Nama profil" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email Google (opsional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Biar langsung nyambung saat login" />
          <ColorPicker value={form.avatar_color} onChange={(c) => setForm({ ...form, avatar_color: c })} />
          <Button type="submit" disabled={busy || !form.name.trim()} className="w-full">{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        </form>
      </Modal>

      {/* Modal ubah profil */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Ubah profil: ${editTarget?.name || ''}`}>
        <form onSubmit={saveEdit} className="space-y-4">
          <Input label="Nama profil" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Email Google" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <ColorPicker value={editForm.avatar_color} onChange={(c) => setEditForm({ ...editForm, avatar_color: c })} />
          <Button type="submit" disabled={editBusy || !editForm.name.trim()} className="w-full">{editBusy ? 'Menyimpan…' : 'Simpan'}</Button>
        </form>
      </Modal>

      {/* Modal detail + statistik */}
      <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title={`Detail: ${detailTarget?.name || ''}`}>
        {detailLoading ? (
          <div className="flex justify-center py-6"><span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
        ) : detailStats ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar p={detailTarget} size={48} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{detailTarget?.name}</p>
                <p className="truncate text-xs text-faint">{detailTarget?.email || 'tanpa email'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-raised p-3 dark:bg-[#1e211c]"><p className="text-[13px] text-sub">Total saldo</p><p className="text-lg font-semibold text-up tnum">{findRupiah(detailStats.balance)}</p></Card>
              <Card className="bg-raised p-3 dark:bg-[#1e211c]"><p className="text-[13px] text-sub">Transaksi</p><p className="text-lg font-semibold text-ink tnum">{detailStats.transaction_count}</p></Card>
              <Card className="bg-raised p-3 dark:bg-[#1e211c]"><p className="text-[13px] text-sub">Akun</p><p className="text-lg font-semibold text-ink tnum">{detailStats.account_count}</p></Card>
              <Card className="bg-raised p-3 dark:bg-[#1e211c]"><p className="text-[13px] text-sub">Kategori</p><p className="text-lg font-semibold text-ink tnum">{detailStats.category_count}</p></Card>
            </div>
            <p className="text-xs text-faint">
              Transaksi terakhir: {detailStats.last_transaction_date || 'belum ada'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-sub">Gagal memuat detail.</p>
        )}
      </Modal>
    </div>
  )
}
