import { useCallback, useEffect, useState } from 'react'
import api, { errMsg } from '../lib/api.js'
import { Button, Card, Input, Modal } from '../components/ui.jsx'
import { toast } from '../components/toast.jsx'

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const WORKDAYS = [0, 1, 2, 3, 4]

const emptyForm = { title: '', note: '', days: [], time: '', enabled: true, kind: 'weekly', targetDate: '' }
const fmtDate = (s) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const emptyDays = (d) => (d.length === 0 ? 'Setiap hari'
  : d.length === 5 && WORKDAYS.every((x) => d.includes(x)) ? 'Hari kerja (Sen–Jum)'
  : d.sort((a, b) => a - b).map((i) => DAYS[i]).join(', '))

export default function Reminders() {
  const [list, setList] = useState([])
  const [dueToday, setDueToday] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(null)
  const [notifPerm, setNotifPerm] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  const load = useCallback(() => {
    api.get('/reminders').then((r) => setList(r.data)).catch(() => {})
  }, [])

  const loadDue = useCallback(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    api.get('/reminders/due', { params: { date_str: `${y}-${m}-${d}` } })
      .then((r) => setDueToday(r.data)).catch(() => {})
  }, [])

  useEffect(() => { load(); loadDue() }, [load, loadDue])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setErr('')
    setModalOpen(true)
  }
  const openEdit = (r) => {
    setEditing(r)
    setForm({ title: r.title, note: r.note || '', days: [...r.days_of_week], time: r.time || '', enabled: r.enabled, kind: r.kind || 'weekly', targetDate: r.target_date || '' })
    setErr('')
    setModalOpen(true)
  }

  const toggleDay = (d) => setForm((f) => ({
    ...f,
    days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d]
  }))

  const submit = async (e) => {
    e.preventDefault()
    if (saving) return
    if (form.kind === 'date' && !form.targetDate) {
      setErr('Untuk tipe tanggal, pilih tanggalnya dulu')
      return
    }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      note: form.note || null,
      days_of_week: form.days,
      time: form.time || null,
      enabled: form.enabled,
      kind: form.kind,
      target_date: form.kind === 'date' ? form.targetDate : null
    }
    try {
      if (editing) await api.patch(`/reminders/${editing.id}`, payload)
      else await api.post('/reminders', payload)
      toast.success(editing ? 'Pengingat berhasil diperbarui' : 'Pengingat berhasil ditambahkan')
      setModalOpen(false)
      load()
      loadDue()
    } catch (e) {
      setErr(errMsg(e))
      toast.error(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  const toggleEnabled = async (r) => {
    if (busy === r.id) return
    setBusy(r.id)
    try {
      await api.patch(`/reminders/${r.id}`, { enabled: !r.enabled })
      load(); loadDue()
    } catch {
      toast.error('Gagal mengubah status pengingat')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (r) => {
    if (busy === r.id) return
    if (!window.confirm(`Hapus pengingat "${r.title}"?`)) return
    setBusy(r.id)
    try {
      await api.delete(`/reminders/${r.id}`)
      load(); loadDue()
      toast.success('Pengingat berhasil dihapus')
    } catch {
      toast.error('Gagal menghapus pengingat')
    } finally {
      setBusy(null)
    }
  }

  const requestPerm = () => {
    if (typeof Notification === 'undefined') return
    Notification.requestPermission().then((p) => setNotifPerm(p))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pengingat</h1>
        <Button onClick={openAdd}>+ Tambah Pengingat</Button>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">Terjadwal hari ini</h2>
          {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
            <button
              onClick={requestPerm}
              className="rounded-full border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Aktifkan notifikasi browser
            </button>
          )}
        </div>
        {dueToday.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Tidak ada pengingat untuk hari ini.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {dueToday.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-medium text-slate-800">{r.title}</div>
                  {r.note && <div className="text-xs text-slate-500">{r.note}</div>}
                </div>
                {r.time && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{r.time}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {notifPerm !== 'unsupported' && (
          <p className="mt-3 text-xs text-slate-400">
            {notifPerm === 'granted' ? 'Notifikasi browser aktif.' : 'Notifikasi muncul selama aplikasi terbuka.'}
          </p>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Semua Pengingat</h2>
          <span className="text-xs text-slate-400">{list.length} item</span>
        </div>
        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Belum ada pengingat. Buat satu untuk mulai.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${r.enabled ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                      {r.title}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                      {r.kind === 'date' ? `Sekali · ${fmtDate(r.target_date)}` : emptyDays(r.days_of_week)}
                    </span>
                    {r.time && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {r.time}
                      </span>
                    )}
                  </div>
                  {r.note && <div className="mt-0.5 text-xs text-slate-500">{r.note}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={r.enabled}
                      disabled={busy === r.id}
                      onChange={() => toggleEnabled(r)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Aktif
                  </label>
                  <button className="text-xs font-medium text-emerald-600 hover:underline" onClick={() => openEdit(r)}>
                    Edit
                  </button>
                  <button className="text-xs font-medium text-rose-600 hover:underline" onClick={() => remove(r)}>
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Pengingat' : 'Tambah Pengingat'}>
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Judul"
            required
            placeholder="cth. Sudah bayar makanan ibu kos?"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Catatan (opsional)"
            placeholder="cth. Cek dapur"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Jenis jadwal</span>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, kind: 'weekly' }))}
                className={`rounded-xl border px-3 py-2 text-xs font-medium ${form.kind === 'weekly' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500'}`}
              >
                Ulangi setiap minggu
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, kind: 'date' }))}
                className={`rounded-xl border px-3 py-2 text-xs font-medium ${form.kind === 'date' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500'}`}
              >
                Tanggal tertentu
              </button>
            </div>
            {form.kind === 'weekly' ? (
              <>
                <span className="mb-1.5 block text-sm font-medium text-slate-600">Ulangi pada hari</span>
                <div className="mb-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, days: [] }))}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${form.days.length === 0 ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500'}`}
                  >
                    Setiap hari
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, days: [...WORKDAYS] }))}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${form.days.length === 5 && WORKDAYS.every((d) => form.days.includes(d)) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500'}`}
                  >
                    Hari kerja
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${form.days.includes(i) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-400">Kosongkan semua = setiap hari.</p>
              </>
            ) : (
              <Input
                label="Tanggal"
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              />
            )}
          </div>
          <Input
            label="Jam (opsional)"
            type="time"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="h-4 w-4 accent-emerald-600"
            />
            Aktifkan pengingat ini
          </label>
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving}>Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
