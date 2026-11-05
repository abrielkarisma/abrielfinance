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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Super Admin</h1>
          <p className="text-sm text-slate-500">Kelola profil & peran user — hanya admin.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Profil Baru</Button>
      </div>

      {/* Blok 3: statistik ringkas */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-slate-500">Total Profil</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{profiles.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Admin</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{nAdmin}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Diarsipkan</p>
          <p className="mt-1 text-2xl font-bold text-slate-500">{nArsip}</p>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[['semua', 'Semua'], ['aktif', 'Aktif'], ['arsip', 'Diarsipkan']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === k ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card><span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /></Card>
      ) : (
        <Card className="space-y-2">
          {visible.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <Avatar p={p} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{p.name}</span>
                  {p.is_admin && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Admin</span>}
                  {p.archived && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">Arsip</span>}
                </div>
                <span className="block text-xs text-slate-400">
                  {p.email || '— belum ada email —'} · bergabung {p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                <Button variant="outline" onClick={() => openDetail(p)}>Detail</Button>
                <Button variant="outline" onClick={() => { setEditTarget(p); setEditForm({ name: p.name, email: p.email || '', avatar_color: p.avatar_color }); setShowEdit(true) }}>Ubah</Button>
                <Button variant="outline" onClick={() => toggleRole(p)}>{p.is_admin ? 'Turunkan' : 'Jadikan Admin'}</Button>
                <Button variant="outline" onClick={() => toggleArchive(p)}>{p.archived ? 'Pulihkan' : 'Arsipkan'}</Button>
                <Button variant="danger" onClick={() => remove(p)}>Hapus</Button>
              </div>
            </div>
          ))}
          {visible.length === 0 && <p className="text-sm text-slate-500">Tidak ada profil.</p>}
        </Card>
      )}

      {/* Modal buat profil baru (tanpa PIN) */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Buat Profil Baru">
        <form onSubmit={create} className="space-y-4">
          <Input label="Nama profil" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email Google (opsional) — biar langsung nyambung saat login" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <ColorPicker value={form.avatar_color} onChange={(c) => setForm({ ...form, avatar_color: c })} />
          <Button type="submit" disabled={busy || !form.name.trim()} className="w-full">{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        </form>
      </Modal>

      {/* Modal ubah profil */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Ubah Profil — ${editTarget?.name || ''}`}>
        <form onSubmit={saveEdit} className="space-y-4">
          <Input label="Nama profil" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Email Google" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <ColorPicker value={editForm.avatar_color} onChange={(c) => setEditForm({ ...editForm, avatar_color: c })} />
          <Button type="submit" disabled={editBusy || !editForm.name.trim()} className="w-full">{editBusy ? 'Menyimpan…' : 'Simpan'}</Button>
        </form>
      </Modal>

      {/* Modal detail + statistik */}
      <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title={`Detail — ${detailTarget?.name || ''}`}>
        {detailLoading ? (
          <div className="flex justify-center py-6"><span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /></div>
        ) : detailStats ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar p={detailTarget} size={48} />
              <div>
                <p className="font-semibold text-slate-800">{detailTarget?.name}</p>
                <p className="text-xs text-slate-400">{detailTarget?.email || 'tanpa email'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3"><p className="text-xs text-slate-500">Total Saldo</p><p className="text-lg font-bold text-emerald-600">{findRupiah(detailStats.balance)}</p></Card>
              <Card className="p-3"><p className="text-xs text-slate-500">Transaksi</p><p className="text-lg font-bold text-slate-800">{detailStats.transaction_count}</p></Card>
              <Card className="p-3"><p className="text-xs text-slate-500">Akun</p><p className="text-lg font-bold text-slate-800">{detailStats.account_count}</p></Card>
              <Card className="p-3"><p className="text-xs text-slate-500">Kategori</p><p className="text-lg font-bold text-slate-800">{detailStats.category_count}</p></Card>
            </div>
            <p className="text-xs text-slate-400">
              Transaksi terakhir: {detailStats.last_transaction_date || 'belum ada'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Gagal memuat detail.</p>
        )}
      </Modal>
    </div>
  )
}
