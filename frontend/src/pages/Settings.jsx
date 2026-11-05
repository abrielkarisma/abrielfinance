import { useState } from 'react'
import api from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Card } from '../components/ui.jsx'
import { Check } from 'lucide-react'

export default function Settings() {
  const { profile, setProfile } = useAuth()
  const [mode, setMode] = useState(() => profile?.salary_end_of_month ? 'eom' : (profile?.salary_day ? 'fixed' : 'calendar'))
  const [day, setDay] = useState(() => profile?.salary_day || 25)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState(null)

  const save = async () => {
    setSaving(true)
    setMsg('')
    setPreview(null)
    const payload = mode === 'eom'
      ? { salary_end_of_month: true }
      : mode === 'fixed'
        ? { salary_day: Number(day), salary_end_of_month: false }
        : { salary_day: null, salary_end_of_month: false }
    try {
      const r = await api.put('/profiles/me/preferences', payload)
      setProfile(r.data)
      localStorage.setItem('user', JSON.stringify(r.data))
      setMsg('Tersimpan')
      const pp = await api.get('/reports/periods', { params: { count: 3 } })
      setPreview(pp.data.periods)
    } catch {
      setMsg('Gagal menyimpan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const radio = (val, label, desc) => (
    <label className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[12px] bg-raised p-3 transition-colors dark:bg-[#1e211c] ${mode === val ? 'ring-2 ring-accent' : 'hover:bg-active'}`}>
      <input
        type="radio"
        name="mode"
        className="mt-1 accent-[#1d5fb6]"
        checked={mode === val}
        onChange={() => setMode(val)}
      />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-faint">{desc}</span>
      </span>
    </label>
  )

  const dayRange = mode === 'calendar' ? null : (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-sub">
          <input type="radio" name="sub" className="accent-[#1d5fb6]" checked={mode === 'fixed'} onChange={() => setMode('fixed')} />
          Tanggal tetap
        </label>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-sub">
          <input type="radio" name="sub" className="accent-[#1d5fb6]" checked={mode === 'eom'} onChange={() => setMode('eom')} />
          Akhir bulan
        </label>
      </div>
      {mode === 'fixed' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-sub">Setiap tanggal</span>
          <input
            type="number"
            min={1}
            max={31}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="h-11 w-20 rounded-[12px] border border-control bg-surface px-3 text-center text-sm text-ink outline-none transition-colors focus:border-accent"
          />
          <span className="text-sm text-sub">tiap bulan</span>
        </div>
      )}
      {mode === 'eom' && (
        <p className="text-xs text-faint">Periode mulai dari hari terakhir bulan (28/29/30/31 sesuai bulan).</p>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <h1>Pengaturan</h1>
        <p className="mt-0.5 text-sm text-sub">Siklus periode laporan keuangan.</p>
      </div>

      <Card className="animate-rise">
        <h2 className="mb-3">Periode gajian</h2>
        <p className="mb-4 text-sm text-sub">
          Laporan “periode ini” dihitung dari tanggal gajianmu, bukan dari kalender.
          Cocok buat yang gajian di tanggal tertentu (mis. 25) atau akhir bulan.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {radio('calendar', 'Kalender', 'Bulan kalender biasa (1 sampai akhir bulan)')}
          {radio('fixed', 'Tanggal tetap', 'Gajian di tanggal tertentu tiap bulan')}
          {radio('eom', 'Akhir bulan', 'Gajian tanggal 28/29/30/31 (hari terakhir)')}
        </div>

        <div className="mt-4 pl-1">{dayRange}</div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary flex min-h-[44px] items-center gap-1.5 px-4 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Menyimpan…' : (<><Check size={16} /> Simpan</>)}
          </button>
          {msg && <span className="text-sm font-medium text-sub">{msg}</span>}
        </div>
      </Card>

      {preview && (
        <Card className="animate-rise">
          <h2 className="mb-3">Pratinjau periode</h2>
          <ul className="space-y-1">
            {preview.map((p, i) => (
              <li key={p.start} className="flex items-center justify-between rounded-[8px] px-2 py-1.5 text-sm hover:bg-raised">
                <span className="text-sub">{i === 0 ? 'Periode ini' : `Periode ${i} lalu`}</span>
                <span className="font-medium text-ink tnum">{p.label}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-xs text-faint">
        Catatan: untuk tanggal di atas 28, bulan yang lebih pendek (mis. Februari) otomatis pakai hari terakhir bulan itu.
        Misal set 30, Februari jadi 28/29, lalu balik lagi ke 30 di bulan berikutnya.
      </p>
    </div>
  )
}
