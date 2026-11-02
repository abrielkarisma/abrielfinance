import { useEffect, useState } from 'react'
import api, { fmtIDR } from '../lib/api.js'
import { Card } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useHideBal } from '../context/BalContext.jsx'
import PeriodNav from '../components/PeriodNav.jsx'
import { usePeriods } from '../lib/periods.js'
import {
  CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'

const cssVar = (n, fb) => (getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb)
const INCOME_COLOR = '#2f7a45'
const EXPENSE_COLOR = '#1b1d1f'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const pad = (n) => String(n).padStart(2, '0')
const dstr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const TIMELINES = [
  { id: 'daily', label: 'Harian' },
  { id: 'weekly', label: 'Mingguan' },
  { id: 'monthly', label: 'Bulanan' },
  { id: 'yearly', label: 'Tahunan' }
]

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[10px] bg-ink px-3 py-2 text-xs font-medium text-white shadow-lg">
      {label && <div className="mb-1 text-white/70">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.stroke || p.color }} />
            {p.name}
          </span>
          <span className="tnum font-semibold">{fmtIDR(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function niceTicks(min, max, n = 5) {
  if (!(max > min)) return [Math.round(min)]
  const step = (max - min) / (n - 1)
  return Array.from({ length: n }, (_, i) => Math.round(min + i * step))
}

// Daftar bucket (lama -> baru) sesuai timeline.
function buildBuckets(tl, selPeriod) {
  const now = new Date()
  const buckets = []
  if (tl === 'daily' && selPeriod) {
    const s = new Date(selPeriod.start + 'T00:00:00')
    const e = new Date(selPeriod.end + 'T00:00:00')
    for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
      const nxt = new Date(d)
      nxt.setDate(nxt.getDate() + 1)
      buckets.push({ label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, start: dstr(d), end: dstr(nxt) })
    }
  } else if (tl === 'weekly') {
    const dow = (now.getDay() + 6) % 7 // 0 = Senin
    const mon = new Date(now)
    mon.setDate(now.getDate() - dow)
    const start = new Date(mon)
    start.setDate(mon.getDate() - 15 * 7)
    for (let i = 0; i < 16; i++) {
      const w = new Date(start)
      w.setDate(start.getDate() + i * 7)
      const we = new Date(w)
      we.setDate(w.getDate() + 7)
      buckets.push({ label: `${w.getDate()} ${MONTHS[w.getMonth()]}`, start: dstr(w), end: dstr(we) })
    }
  } else if (tl === 'monthly') {
    const yr = now.getFullYear()
    for (let m = 0; m < 12; m++) {
      const s = new Date(yr, m, 1)
      const e = new Date(yr, m + 1, 1)
      buckets.push({ label: MONTHS[m], start: dstr(s), end: dstr(e) })
    }
  } else {
    const startYr = now.getFullYear() - 4
    const curYr = now.getFullYear()
    for (let y = startYr; y <= curYr; y++) {
      const s = new Date(y, 0, 1)
      const e = new Date(y + 1, 0, 1)
      buckets.push({ label: String(y), start: dstr(s), end: dstr(e) })
    }
  }
  return buckets
}

export default function Grafik() {
  const { profile } = useAuth()
  const { hide } = useHideBal()
  const incCol = cssVar('--color-up', INCOME_COLOR)
  const expCol = document.documentElement.classList.contains('dark') ? '#e2e5e8' : EXPENSE_COLOR
  const [, bump] = useState(0)
  useEffect(() => {
    const h = () => bump((x) => x + 1)
    window.addEventListener('fundy-theme', h)
    return () => window.removeEventListener('fundy-theme', h)
  }, [])

  const [tl, setTl] = useState('daily')
  const [selBack, setSelBack] = useState(0)
  const selPeriods = usePeriods(selBack + 1, profile?.salary_day, profile?.salary_end_of_month)
  const selPeriod = selPeriods[selBack] || null

  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(false)
  const [showIncome, setShowIncome] = useState(true)
  const [showExpense, setShowExpense] = useState(true)
  const [cats, setCats] = useState([])
  const [balancePie, setBalancePie] = useState([])
  const [selSum, setSelSum] = useState(null)

  // data periode terpilih: summary (untuk kartu & kategori) + distribusi saldo
  useEffect(() => {
    if (!selPeriod) return
    let alive = true
    api.get('/reports/summary', { params: { start: selPeriod.start, end: selPeriod.end } })
      .then((r) => { if (alive) { setSelSum(r.data); setCats(r.data.by_category || []) } })
      .catch(() => {})
    return () => { alive = false }
  }, [selPeriod?.start, selPeriod?.end])

  useEffect(() => {
    if (!selPeriod) return
    let alive = true
    api.get('/reports/accounts', { params: { end: selPeriod.end } })
      .then((r) => { if (alive) setBalancePie(r.data.accounts || []) })
      .catch(() => {})
    return () => { alive = false }
  }, [selPeriod?.end])

  // data chart utama sesuai timeline
  useEffect(() => {
    const buckets = buildBuckets(tl, selPeriod)
    if (!buckets.length) return
    let alive = true
    setLoading(true)
    Promise.all(buckets.map(async (b) => {
      const r = await api.get('/reports/summary', { params: { start: b.start, end: b.end } })
      return { ...b, income: r.data.total_income || 0, expense: r.data.total_expense || 0 }
    }))
      .then((data) => { if (alive) setSeries(data) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tl, selPeriod?.start, selPeriod?.end])

  const expenseByCat = cats.filter((c) => c.category?.kind === 'expense')
  const balData = balancePie.map((a) => ({ name: a.account.name, value: a.balance, color: a.account.color }))

  const tVals = []
  if (showIncome) tVals.push(...series.map((t) => t.income))
  if (showExpense) tVals.push(...series.map((t) => t.expense))
  const tMin = tVals.length ? Math.min(...tVals) : 0
  const tMax = tVals.length ? Math.max(...tVals) : 1
  const tDomain = tMax === tMin ? [0, tMax + 1] : [tMin, tMax]

  const fmtAxis = (v) => {
    if (v >= 1e6) return v % 1e6 === 0 ? `${v / 1e6} juta` : `${(v / 1e6).toFixed(1).replace('.', ',')} juta`
    if (v >= 1000) return `${Math.round(v / 1000)} rb`
    return String(v)
  }

  const tlTitle = {
    daily: `Arus kas harian · ${selPeriod?.label ?? ''}`,
    weekly: 'Rekap mingguan · 16 minggu terakhir',
    monthly: `Rekap bulanan · ${new Date().getFullYear()}`,
    yearly: 'Rekap tahunan · 5 tahun terakhir'
  }[tl]

  const chip = (on, setOn, colorOn, label) => (
    <button
      onClick={() => setOn((s) => !s)}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        on ? colorOn : 'border-slate-300 text-slate-500'
      }`}
    >
      {on ? '✓ ' : '○ '}{label}
    </button>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Grafik</h1>
          <p className="text-sm text-slate-400">Tren keuanganmu · {tlTitle}</p>
        </div>

      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="animate-rise">
          <p className="text-sm text-slate-500">Pemasukan · {selPeriod?.label ?? 'periode ini'}</p>
          <p className="mt-1 text-2xl font-bold text-up tnum">{hide ? 'Rp •••' : fmtIDR(selSum?.total_income)}</p>
        </Card>
        <Card className="animate-rise" style={{ animationDelay: '60ms' }}>
          <p className="text-sm text-slate-500">Pengeluaran · {selPeriod?.label ?? 'periode ini'}</p>
          <p className="mt-1 text-2xl font-bold text-ink tnum">{hide ? 'Rp •••' : fmtIDR(selSum?.total_expense)}</p>
        </Card>
      </div>

      <Card className="animate-rise">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">{tlTitle}</h2>
          <div className="flex items-center gap-1.5">
            {chip(showIncome, setShowIncome, 'border-up bg-up-soft text-up', 'Pemasukan')}
            {chip(showExpense, setShowExpense, 'border-ink bg-neutral-soft text-ink', 'Pengeluaran')}
          </div>
        </div>
        <p className="mb-3 text-xs text-slate-400">Total pemasukan & pengeluaran per {tl === 'daily' ? 'hari ' : tl === 'weekly' ? 'minggu ' : tl === 'monthly' ? 'bulan ' : 'tahun '}dalam rentang timeline. Klik chip untuk tampil/sembunyikan garis.</p>
        <div className="mb-4 flex justify-center">
          <div className="flex rounded-[10px] border border-slate-300 p-0.5">
            {TIMELINES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTl(t.id)}
                className={`rounded-[8px] px-3 py-1 text-xs font-semibold transition-colors ${
                  tl === t.id ? 'bg-[#1b1d1f] text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-72">
          {loading && series.length === 0 ? (
            <p className="py-20 text-center text-sm text-slate-400">Memuat…</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={8} interval="preserveStartEnd" height={30} />
                <YAxis domain={tDomain} ticks={niceTicks(tMin, tMax)} width={52} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {showIncome && (
                  <Line type="monotone" dataKey="income" name="Pemasukan" stroke={incCol} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                )}
                {showExpense && (
                  <Line type="monotone" dataKey="expense" name="Pengeluaran" stroke={expCol} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="animate-rise" style={{ animationDelay: '180ms' }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Pengeluaran per Kategori</h2>
            <span className="text-xs font-semibold text-slate-500">{selPeriod?.label ?? ''}</span>
          </div>
          {expenseByCat.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Belum ada data pengeluaran periode ini.</p>
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseByCat} dataKey="total" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} isAnimationActive={false}>
                      {expenseByCat.map((c, i) => <Cell key={i} fill={c.category.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1">
                {expenseByCat.map((c) => (
                  <div key={c.category.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.category.color }} />
                      {c.category.name}
                    </span>
                    <span className="font-medium text-slate-700 tnum">{fmtIDR(c.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="animate-rise" style={{ animationDelay: '240ms' }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Distribusi Saldo per Akun</h2>
            <span className="text-xs font-semibold text-slate-500">s.d. {selPeriod?.end ?? ''}</span>
          </div>
          {balData.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Belum ada akun.</p>
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={balData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} isAnimationActive={false}>
                      {balData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1">
                {balData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-medium text-slate-700 tnum">{fmtIDR(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
