import { useEffect, useState } from 'react'
import api, { fmtIDR } from '../lib/api.js'
import { Card } from '../components/ui.jsx'
import {
  CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'

const INCOME_COLOR = '#10b981'
const EXPENSE_COLOR = '#f43f5e'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const WINDOW = 6   // jumlah bulan yang tampil sekaligus
const STEP = 3     // berapa bulan bergeser tiap klik
const MAX_BACK = 60 // maksimal mundur (bulan)

function monthDelta(date, delta) {
  const d = new Date(date)
  d.setDate(1)
  d.setMonth(d.getMonth() + delta)
  return d
}

function MonthInput({ value, onChange }) {
  return (
    <input
      type="month"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
  const [catMonth, setCatMonth] = useState(() => now.toISOString().slice(0, 7))
  const [accMonth, setAccMonth] = useState(() => now.toISOString().slice(0, 7))
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

  const expenseByCat = cats.filter((c) => c.category?.kind === 'expense')
  const balData = balancePie.map((a) => ({ name: a.account.name, value: a.balance, color: a.account.color }))
  const totalIncome = trend.reduce((s, t) => s + t.income, 0)
  const totalExpense = trend.reduce((s, t) => s + t.expense, 0)

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
      <h1 className="text-2xl font-bold">Grafik</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-slate-500">Pemasukan ({WINDOW} bulan tampil)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{fmtIDR(totalIncome)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Pengeluaran ({WINDOW} bulan tampil)</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{fmtIDR(totalExpense)}</p>
        </Card>
      </div>

      <Card>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Pemasukan vs Pengeluaran</h2>
            <div className="flex items-center gap-1.5">
              {chip(showIncome, setShowIncome, 'border-emerald-500 bg-emerald-50 text-emerald-700', 'Pemasukan')}
              {chip(showExpense, setShowExpense, 'border-rose-500 bg-rose-50 text-rose-600', 'Pengeluaran')}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={back >= MAX_BACK}
              onClick={() => setBack((b) => Math.min(b + STEP, MAX_BACK))}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              ◀ Lebih lama
            </button>
            <span className="px-1 text-xs font-semibold text-slate-500">{rangeText}</span>
            <button
              disabled={back === 0}
              onClick={() => setBack((b) => Math.max(b - STEP, 0))}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
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
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis width={52} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}rb` : v)} />
                <Tooltip formatter={(v) => fmtIDR(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {showIncome && (
                  <Line type="monotone" dataKey="income" name="Pemasukan" stroke={INCOME_COLOR} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                )}
                {showExpense && (
                  <Line type="monotone" dataKey="expense" name="Pengeluaran" stroke={EXPENSE_COLOR} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
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
                  <Tooltip formatter={(v) => fmtIDR(v)} />
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
                <span className="font-medium text-slate-700">{fmtIDR(c.total)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
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
                    <Tooltip formatter={(v) => fmtIDR(v)} />
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
                    <span className="font-medium text-slate-700">{fmtIDR(d.value)}</span>
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
