import { useCallback, useEffect, useState } from 'react'
import api, { errMsg } from '../lib/api.js'
import { Button, Card, Input, Modal } from '../components/ui.jsx'
import { Bell, CalendarDays, Check, Plus, Repeat } from 'lucide-react'
import { toast } from '../components/toast.jsx'

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const WORKDAYS = [0, 1, 2, 3, 4]

const emptyForm = { title: '', note: '', days: [], time: '', enabled: true, kind: 'weekly', targetDate: '' }
const fmtDate = (s) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const emptyDays = (d) => (d.length === 0 ? 'Setiap hari'
  : d.length === 5 && WORKDAYS.every((x) => d.includes(x)) ? 'Hari kerja (Sen sampai Jum)'
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
    if (!window.confirm(`Hapus pengingat “${r.title}”?`)) return
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

  const segBtn = (active) => `flex min-h-[52px] items-center justify-center gap-1.5 rounded-[8px] px-3 text-xs font-semibold transition-colors ${
    active ? 'chip-active' : 'text-sub hover:text-ink'}`

  const dayChip = (active) => `flex min-h-[44px] items-center rounded-full px-3.5 text-xs font-medium transition-colors ${
    active ? 'chip-active' : 'bg-raised text-sub hover:bg-active dark:bg-[#1e211c]'}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Pengingat</h1>
        <Button onClick={openAdd}><Plus size={16} /> Tambah pengingat</Button>
      </div>

      <Card className="p-2 sm:p-3">
        <div className="mb-1 flex min-h-[44px] flex-wrap items-center justify-between gap-2 px-1">
          <h2>Terjadwal hari ini</h2>
          {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
            <button
              onClick={requestPerm}
              className="flex min-h-[44px] items-center rounded-full bg-raised px-3.5 text-xs font-semibold text-ink transition-colors hover:bg-active"
            >
              Aktifkan notifikasi browser
            </button>
          )}
        </div>
        {dueToday.length === 0 ? (
          <p className="py-6 text-center text-sm text-faint">Tidak ada pengingat untuk hari ini.</p>
        ) : (
          <ul className="space-y-1">
            {dueToday.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-[12px] bg-raised px-3.5 py-3 dark:bg-[#1e211c]">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink">{r.title}</div>
                  {r.note && <div className="truncate text-xs text-sub">{r.note}</div>}
                </div>
                {r.time && (
                  <span className="shrink-0 rounded-full bg-active px-2.5 py-1 text-xs font-semibold text-ink tnum dark:bg-[#2a2e26]">{r.time}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {notifPerm !== 'unsupported' && (
          <p className="mt-3 text-xs text-faint">
            {notifPerm === 'granted' ? 'Notifikasi browser aktif.' : 'Notifikasi muncul selama aplikasi terbuka.'}
          </p>
        )}
      </Card>

      <Card className="p-2 sm:p-3">
        <div className="mb-1 flex min-h-[44px] items-center justify-between px-1">
          <h2>Semua pengingat</h2>
          <span className="text-xs text-faint tnum">{list.length} item</span>
        </div>
        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-faint">
            Belum ada pengingat. Buat satu untuk mulai.
          </p>
        ) : (
          <ul className="space-y-1">
            {list.map((r) => (
              <li key={r.id} className="rounded-[12px] bg-raised px-3.5 py-3 dark:bg-[#1e211c]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className={`truncate text-sm font-medium ${r.enabled ? 'text-ink' : 'text-faint line-through'}`}>
                      {r.title}
                    </span>
                    <span className="whitespace-nowrap rounded-full bg-active px-2 py-0.5 text-[11px] font-medium text-sub dark:bg-[#2a2e26]">
                      {r.kind === 'date' ? `Sekali, ${fmtDate(r.target_date)}` : emptyDays(r.days_of_week)}
                    </span>
                    {r.time && (
                      <span className="whitespace-nowrap rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-ink tnum">
                        {r.time}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-1.5 px-1 text-xs text-sub">
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        disabled={busy === r.id}
                        onChange={() => toggleEnabled(r)}
                        className="h-4 w-4 accent-[#1d5fb6]"
                      />
                      Aktif
                    </label>
                    <button className="flex min-h-[44px] items-center rounded-[8px] px-2 text-xs font-medium text-accent hover:bg-active" onClick={() => openEdit(r)}>
                      Edit
                    </button>
                    <button className="flex min-h-[44px] items-center rounded-[8px] px-2 text-xs font-medium text-down hover:bg-down-soft" onClick={() => remove(r)}>
                      Hapus
                    </button>
                  </div>
                </div>
                {r.note && <div className="mt-0.5 truncate text-xs text-sub">{r.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit pengingat' : 'Tambah pengingat'}
        subtitle={editing ? 'Perbarui jadwal pengingat.' : 'Jadwalkan pengingat rutin.'}
        icon={<Bell size={22} strokeWidth={2} />}
      >
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
            <span className="mb-1.5 block text-sm font-medium text-sub">Jenis jadwal</span>
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-[12px] bg-raised p-1 dark:bg-[#1e211c]">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, kind: 'weekly' }))}
                aria-pressed={form.kind === 'weekly'}
                className={segBtn(form.kind === 'weekly')}
              >
                <Repeat size={15} /> Setiap minggu
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, kind: 'date' }))}
                aria-pressed={form.kind === 'date'}
                className={segBtn(form.kind === 'date')}
              >
                <CalendarDays size={15} /> Tanggal tertentu
              </button>
            </div>
            {form.kind === 'weekly' ? (
              <>
                <span className="mb-1.5 block text-sm font-medium text-sub">Ulangi pada hari</span>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, days: [] }))}
                    aria-pressed={form.days.length === 0}
                    className={dayChip(form.days.length === 0)}
                  >
                    Setiap hari
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, days: [...WORKDAYS] }))}
                    aria-pressed={form.days.length === 5 && WORKDAYS.every((d) => form.days.includes(d))}
                    className={dayChip(form.days.length === 5 && WORKDAYS.every((d) => form.days.includes(d)))}
                  >
                    Hari kerja
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(i)}
                      aria-pressed={form.days.includes(i)}
                      className={dayChip(form.days.includes(i))}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-faint">Kosongkan semua sama dengan setiap hari.</p>
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
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="h-4 w-4 accent-[#1d5fb6]"
            />
            Aktifkan pengingat ini
          </label>
          {err && <p className="text-sm text-down">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving}><Check size={16} /> Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
