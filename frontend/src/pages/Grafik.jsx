import { useEffect, useState } from 'react'
import api, { fmtIDR } from '../lib/api.js'
import { Card } from '../components/ui.jsx'
import { useHideBal } from '../context/BalContext.jsx'
import {
  CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'

const cssVar = (n, fb) => (getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb)
const INCOME_COLOR = '#2f7a45'
const EXPENSE_COLOR = '#1b1d1f'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const WINDOW = 6   
const STEP = 3     
const MAX_BACK = 60 

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

function monthDelta(date, delta) {
  const d = new Date(date)
  d.setDate(1)
  d.setMonth(d.getMonth() + delta)
  return d
}

function niceTicks(min, max, n = 5) {
  if (!(max > min)) return [Math.round(min)]
  const step = (max - min) / (n - 1)
  return Array.from({ length: n }, (_, i) => Math.round(min + i * step))
}

function MonthInput({ value, onChange }) {
  return (
    <input
      type="month"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-[10px] border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
    />
  )
}

export default function Grafik() {
  const now = new Date()
  const [back, setBack] = useState(0)
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [showIncome, setShowIncome] = useState(true)
  const [showExpense, setShowExpense] = useState(true)
  const [dShowIncome, setDShowIncome] = useState(true)
  const [dShowExpense, setDShowExpense] = useState(true)
  const [catMonth, setCatMonth] = useState(() => now.toISOString().slice(0, 7))
  const [accMonth, setAccMonth] = useState(() => now.toISOString().slice(0, 7))
  const [dailyMonth, setDailyMonth] = useState(() => now.toISOString().slice(0, 7))
  const [daily, setDaily] = useState([])
  const { hide } = useHideBal()
  const incCol = cssVar('--color-up', INCOME_COLOR)
  const expCol = document.documentElement.classList.contains('dark') ? '#e2e5e8' : EXPENSE_COLOR
  const [, bump] = useState(0)
  useEffect(() => {
    const h = () => bump((x) => x + 1)
    window.addEventListener('fundy-theme', h)
    return () => window.removeEventListener('fundy-theme', h)
  }, [])
  const [cats, setCats] = useState([])
  const [balancePie, setBalancePie] = useState([])

  useEffect(() => {
    let alive = true
    const arr = []
    for (let i = 0; i < WINDOW; i++) {
      const d = monthDelta(now, -(back + i))
      arr.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: MONTHS[d.getMonth()],
        year: d.getFullYear()
      })
    }
    setLoading(true)
    Promise.all(arr.map(async ({ key }) => {
      const y = Number(key.slice(0, 4))
      const m = Number(key.slice(5))
      const r = await api.get('/reports/summary', { params: { year: y, month: m } })
      return r.data
    }))
      .then((rows) => {
        if (!alive) return
        setTrend(rows.map((row, idx) => ({
          name: `${arr[idx].label} ${String(arr[idx].year).slice(2)}`,
          income: row.total_income || 0,
          expense: row.total_expense || 0,
          key: arr[idx].key
        })))
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [back])

  useEffect(() => {
    const [y, m] = catMonth.split('-').map(Number)
    api.get('/reports/summary', { params: { year: y, month: m } })
      .then((r) => setCats(r.data.by_category || [])).catch(() => {})
  }, [catMonth])

  useEffect(() => {
    const [y, m] = accMonth.split('-').map(Number)
    api.get('/reports/accounts', { params: { year: y, month: m } })
      .then((r) => setBalancePie(r.data.accounts || [])).catch(() => {})
  }, [accMonth])

  useEffect(() => {
    const [y, m] = dailyMonth.split('-').map(Number)
    if (!y || !m) return
    const start = `${dailyMonth}-01`
    const end = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    api.get('/transactions', { params: { start, end, limit: 2000 } })
      .then((r) => {
        const daysIn = new Date(y, m, 0).getDate()
        const byDay = Array.from({ length: daysIn }, (_, i) => ({ day: i + 1, income: 0, expense: 0 }))
        ;(r.data.items || []).forEach((t) => {
          if (t.kind !== 'income' && t.kind !== 'expense') return
          const d = Number(t.date.slice(8, 10))
          if (d >= 1 && d <= daysIn) byDay[d - 1][t.kind] += t.amount
        })
        setDaily(byDay.map((x) => ({ ...x, name: String(x.day) })))
      })
      .catch(() => {})
  }, [dailyMonth])

  const expenseByCat = cats.filter((c) => c.category?.kind === 'expense')
  const balData = balancePie.map((a) => ({ name: a.account.name, value: a.balance, color: a.account.color }))
  const totalIncome = trend.reduce((s, t) => s + t.income, 0)
  const totalExpense = trend.reduce((s, t) => s + t.expense, 0)

  const tVals = []
  if (showIncome) tVals.push(...trend.map((t) => t.income))
  if (showExpense) tVals.push(...trend.map((t) => t.expense))
  const tMin = tVals.length ? Math.min(...tVals) : 0
  const tMax = tVals.length ? Math.max(...tVals) : 1
  const tDomain = tMax === tMin ? [0, tMax + 1] : [tMin, tMax]

  const dVals = []
  if (dShowIncome) dVals.push(...daily.map((d) => d.income))
  if (dShowExpense) dVals.push(...daily.map((d) => d.expense))
  const dMin = dVals.length ? Math.min(...dVals) : 0
  const dMax = dVals.length ? Math.max(...dVals) : 1
  const dDomain = dMax === dMin ? [0, dMax + 1] : [dMin, dMax]

  const fmtAxis = (v) => {
    if (v >= 1e6) return v % 1e6 === 0 ? `${v / 1e6} juta` : `${(v / 1e6).toFixed(1).replace('.', ',')} juta`
    if (v >= 1000) return `${Math.round(v / 1000)} rb`
    return String(v)
  }

  const dNew = monthDelta(now, -back)
  const dOld = monthDelta(now, -(back + WINDOW - 1))
  const rangeText = `${MONTHS[dOld.getMonth()]} ${dOld.getFullYear()} – ${MONTHS[dNew.getMonth()]} ${dNew.getFullYear()}`

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
          <p className="text-sm text-slate-400">Tren keuanganmu</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="animate-rise">
          <p className="text-sm text-slate-500">Pemasukan ({WINDOW} bulan tampil)</p>
          <p className="mt-1 text-2xl font-bold text-up tnum">{hide ? 'Rp •••' : fmtIDR(totalIncome)}</p>
        </Card>
        <Card className="animate-rise" style={{ animationDelay: '60ms' }}>
          <p className="text-sm text-slate-500">Pengeluaran ({WINDOW} bulan tampil)</p>
          <p className="mt-1 text-2xl font-bold text-ink tnum">{hide ? 'Rp •••' : fmtIDR(totalExpense)}</p>
        </Card>
      </div>

      <Card className="animate-rise" style={{ animationDelay: '120ms' }}>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Pemasukan vs Pengeluaran</h2>
            <div className="flex items-center gap-1.5">
              {chip(showIncome, setShowIncome, 'border-up bg-up-soft text-up', 'Pemasukan')}
              {chip(showExpense, setShowExpense, 'border-ink bg-neutral-soft text-ink', 'Pengeluaran')}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={back >= MAX_BACK}
              onClick={() => setBack((b) => Math.min(b + STEP, MAX_BACK))}
              className="rounded-[10px] border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              ◀ Lebih lama
            </button>
            <span className="px-1 text-xs font-semibold text-slate-500">{rangeText}</span>
            <button
              disabled={back === 0}
              onClick={() => setBack((b) => Math.max(b - STEP, 0))}
              className="rounded-[10px] border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Terbaru ▶
            </button>
          </div>
        </div>
        <p className="mb-3 text-xs text-slate-400">Geser untuk melihat bulan-bulan sebelumnya. Klik chip untuk tampil/sembunyikan garis.</p>
        <div className="h-64">
          {loading && trend.length === 0 ? (
            <p className="py-20 text-center text-sm text-slate-400">Memuat…</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickMargin={8} height={28} />
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

      <Card className="animate-rise" style={{ animationDelay: '150ms' }}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Arus Kas Harian</h2>
            <p className="text-xs text-slate-400">Pemasukan & pengeluaran per hari</p>
          </div>
          <MonthInput value={dailyMonth} onChange={setDailyMonth} />
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {chip(dShowIncome, setDShowIncome, 'border-up bg-up-soft text-up', 'Pemasukan')}
          {chip(dShowExpense, setDShowExpense, 'border-ink bg-neutral-soft text-ink', 'Pengeluaran')}
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" tickMargin={8} height={28} />
              <YAxis domain={dDomain} ticks={niceTicks(dMin, dMax)} width={52} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {dShowIncome && (
                <Line type="monotone" dataKey="income" name="Pemasukan" stroke={incCol} strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
              )}
              {dShowExpense && (
                <Line type="monotone" dataKey="expense" name="Pengeluaran" stroke={expCol} strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="animate-rise" style={{ animationDelay: '180ms' }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Pengeluaran per Kategori</h2>
            <MonthInput value={catMonth} onChange={setCatMonth} />
          </div>
          {expenseByCat.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Belum ada data pengeluaran bulan ini.</p>
          ) : (
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
          )}
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
        </Card>

        <Card className="animate-rise" style={{ animationDelay: '240ms' }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Distribusi Saldo per Akun</h2>
            <MonthInput value={accMonth} onChange={setAccMonth} />
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
