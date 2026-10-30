import { useCallback, useEffect, useState } from 'react'
import api, { errMsg } from '../lib/api.js'
import { Avatar } from './Login.jsx'
import { Button, Card, Input, Modal } from '../components/ui.jsx'
import { ColorPicker, PALETTE } from '../components/ui.jsx'
import { toast } from '../components/toast.jsx'

export default function Admin() {
  const [profiles, setProfiles] = useState([])
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
  const [form, setForm] = useState({ name: '', pin: '', avatar_color: PALETTE[1] })
  const [busy, setBusy] = useState(false)

  
  const [showReset, setShowReset] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [newPin, setNewPin] = useState('')
  const [resetBusy, setResetBusy] = useState(false)

  
  const [showEdit, setShowEdit] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', avatar_color: PALETTE[1] })
  const [editBusy, setEditBusy] = useState(false)

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.post('/admin/profiles', form)
      toast.success(`Profil "${form.name}" dibuat`)
      setShowCreate(false)
      setForm({ name: '', pin: '', avatar_color: PALETTE[1] })
      load()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const confirmReset = async (e) => {
    e.preventDefault()
    setResetBusy(true)
    try {
      await api.post(`/admin/profiles/${resetTarget.id}/reset-pin`, { new_pin: newPin })
      toast.success(`PIN "${resetTarget.name}" diganti`)
      setShowReset(false)
      setNewPin('')
      setResetTarget(null)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setResetBusy(false)
    }
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setEditBusy(true)
    try {
      await api.patch(`/admin/profiles/${editTarget.id}`, editForm)
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Kelola Profil</h1>
          <p className="text-sm text-slate-500">Semua profil di perangkat ini — cuma admin yang bisa mengelola.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Profil Baru</Button>
      </div>

      {loading ? (
        <Card><span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /></Card>
      ) : (
        <Card className="space-y-2">
          {profiles.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <Avatar p={p} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{p.name}</span>
                  {p.is_admin && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Admin</span>}
                </div>
                <span className="text-xs text-slate-400">Profil #{p.id}</span>
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                <Button variant="outline" onClick={() => { setEditTarget(p); setEditForm({ name: p.name, avatar_color: p.avatar_color }); setShowEdit(true) }}>Ubah</Button>
                <Button variant="outline" onClick={() => { setResetTarget(p); setNewPin(''); setShowReset(true) }}>Reset PIN</Button>
                <Button variant="danger" onClick={() => remove(p)}>Hapus</Button>
              </div>
            </div>
          ))}
          {profiles.length === 0 && <p className="text-sm text-slate-500">Belum ada profil.</p>}
        </Card>
      )}

      {}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Buat Profil Baru">
        <form onSubmit={create} className="space-y-4">
          <Input label="Nama profil" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="PIN awal (4 angka)" type="password" inputMode="numeric" maxLength={4} pattern="[0-9]*" required value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
          <ColorPicker value={form.avatar_color} onChange={(c) => setForm({ ...form, avatar_color: c })} />
          <Button type="submit" disabled={busy || form.pin.length !== 4} className="w-full">{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        </form>
      </Modal>

      {}
      <Modal open={showReset} onClose={() => setShowReset(false)} title={`Reset PIN — ${resetTarget?.name || ''}`}>
        <form onSubmit={confirmReset} className="space-y-4">
          <Input label="PIN baru (4 angka)" type="password" inputMode="numeric" maxLength={4} pattern="[0-9]*" required value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <Button type="submit" disabled={resetBusy || newPin.length !== 4} className="w-full">{resetBusy ? 'Menyimpan…' : 'Ganti PIN'}</Button>
        </form>
      </Modal>

      {}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Ubah Profil — ${editTarget?.name || ''}`}>
        <form onSubmit={saveEdit} className="space-y-4">
          <Input label="Nama profil" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <ColorPicker value={editForm.avatar_color} onChange={(c) => setEditForm({ ...editForm, avatar_color: c })} />
          <Button type="submit" disabled={editBusy} className="w-full">{editBusy ? 'Menyimpan…' : 'Simpan'}</Button>
        </form>
      </Modal>
    </div>
  )
}
