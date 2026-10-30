import { useEffect, useState } from 'react'
import api, { fmtIDR } from '../lib/api.js'
import { Card } from '../components/ui.jsx'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const INCOME_COLOR = '#10b981'
const EXPENSE_COLOR = '#f43f5e'

function monthDelta(date, delta) {
  const d = new Date(date)
  d.setDate(1)
  d.setMonth(d.getMonth() + delta)
  return d
}

export default function Grafik() {
  const now = new Date()
  const [trend, setTrend] = useState([])
  const [month, setMonth] = useState(() => now.toISOString().slice(0, 7))
  const [cats, setCats] = useState([])
  const [balancePie, setBalancePie] = useState([])

  useEffect(() => {
    const arr = []
    for (let i = 5; i >= 0; i--) {
      const d = monthDelta(now, -i)
      arr.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: MONTHS[d.getMonth()] })
    }
    Promise.all(
      arr.map(async ({ key, label }) => {
        const y = Number(key.slice(0, 4))
        const m = Number(key.slice(5))
        const r = await api.get('/reports/summary', { params: { year: y, month: m } })
        return { name: label, income: r.data.total_income || 0, expense: r.data.total_expense || 0 }
      })
    ).then(setTrend).catch(() => {})
  }, [])

  useEffect(() => {
    const [y, m] = month.split('-').map(Number)
    api.get('/reports/summary', { params: { year: y, month: m } })
      .then((r) => setCats((r.data.by_category || []).filter((c) => c.category?.kind === 'expense')))
      .catch(() => {})
  }, [month])

  useEffect(() => {
    api.get('/reports/accounts')
      .then((r) => setBalancePie((r.data.accounts || []).filter((a) => a.balance !== 0)))
      .catch(() => {})
  }, [])

  const totalIncome = trend.reduce((s, t) => s + t.income, 0)
  const totalExpense = trend.reduce((s, t) => s + t.expense, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Grafik</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-slate-500">Pemasukan (6 bulan terakhir)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{fmtIDR(totalIncome)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Pengeluaran (6 bulan terakhir)</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{fmtIDR(totalExpense)}</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Pemasukan vs Pengeluaran (6 bulan)</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={55} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}rb` : v)} />
              <Tooltip formatter={(v) => fmtIDR(v)} />
              <Legend />
              <Bar dataKey="income" name="Pemasukan" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Pengeluaran" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Pengeluaran per Kategori</h2>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          {cats.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Belum ada data pengeluaran bulan ini.</p>
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cats} dataKey="total" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {cats.map((c, i) => <Cell key={i} fill={c.category.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmtIDR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1">
                {cats.map((c) => (
                  <div key={c.category.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.category.color }} />
                      {c.category.name}
                    </span>
                    <span className="font-medium text-slate-700">{fmtIDR(c.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Distribusi Saldo per Akun</h2>
          {balancePie.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Belum ada saldo akun.</p>
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={balancePie} dataKey="balance" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {balancePie.map((a, i) => <Cell key={i} fill={a.account.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmtIDR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1">
                {balancePie.map((a) => (
                  <div key={a.account.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: a.account.color }} />
                      {a.account.name}
                    </span>
                    <span className="font-medium text-slate-700">{fmtIDR(a.balance)}</span>
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
