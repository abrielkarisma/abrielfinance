import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { fmtIDR } from '../lib/api.js'
import { Badge, Button, Card } from '../components/ui.jsx'
import { BarChart, Bar, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const INCOME_COLOR = '#10b981'
const EXPENSE_COLOR = '#f43f5e'

export default function Dashboard() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState([])
  const [accts, setAccts] = useState([])

  useEffect(() => {
    const [y, m] = month.split('-').map(Number)
    api.get('/reports/summary', { params: { year: y, month: m } }).then((r) => setSummary(r.data)).catch(() => {})
    api.get('/transactions', { params: { limit: 6 } }).then((r) => setRecent(r.data)).catch(() => {})
  }, [month])

  useEffect(() => {
    api.get('/reports/accounts').then((r) => setAccts(r.data.accounts)).catch(() => {})
  }, [])

  const expenseByCat = (summary?.by_category || []).filter((c) => c.category?.kind === 'expense')
  const totalBal = accts.reduce((s, a) => s + a.balance, 0)

  const compare = [
    { name: 'Pemasukan', value: summary?.total_income || 0, fill: INCOME_COLOR },
    { name: 'Pengeluaran', value: summary?.total_expense || 0, fill: EXPENSE_COLOR }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4" style={{ borderLeftColor: INCOME_COLOR }}>
          <p className="text-sm text-slate-500">Pemasukan (bulan ini)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{fmtIDR(summary?.total_income)}</p>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: EXPENSE_COLOR }}>
          <p className="text-sm text-slate-500">Pengeluaran (bulan ini)</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{fmtIDR(summary?.total_expense)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Saldo bulan ini</p>
          <p className={`mt-1 text-2xl font-bold ${(summary?.balance ?? 0) >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            {fmtIDR(summary?.balance)}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Saldo per Akun</h2>
        {accts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Belum ada akun.</p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {accts.map((r) => (
                <li key={r.account.id} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.account.color }} />
                    {r.account.name}
                    <span className="text-xs text-slate-400">({r.account.type === 'cash' ? 'Tunai' : r.account.type === 'ewallet' ? 'E-Wallet' : 'Bank'})</span>
                  </span>
                  <span className={`text-sm font-semibold ${r.balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                    {fmtIDR(r.balance)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-sm font-medium text-slate-500">Total Saldo</span>
              <span className={`text-base font-bold ${totalBal >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {fmtIDR(totalBal)}
              </span>
            </div>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Pemasukan vs Pengeluaran</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compare} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => fmtIDR(v)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {compare.map((c, i) => <Cell key={i} fill={c.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Pengeluaran per Kategori</h2>
          {expenseByCat.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Belum ada data pengeluaran bulan ini.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseByCat} dataKey="total" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {expenseByCat.map((c, i) => (
                      <Cell key={i} fill={c.category.color} />
                    ))}
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
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Transaksi Terbaru</h2>
          <Link to="/transactions" className="text-sm font-medium text-emerald-600 hover:underline">Lihat semua</Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Belum ada transaksi. Mulai catat dari halaman Transaksi.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {t.category ? <Badge color={t.category.color}>{t.category.name}</Badge> : <Badge color="#94a3b8">Tanpa kategori</Badge>}
                  {t.account && <Badge color={t.account.color}>{t.account.name}</Badge>}
                  <span className="text-sm text-slate-600">{t.note || (t.kind === 'income' ? 'Pemasukan' : 'Pengeluaran')}</span>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${t.kind === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.kind === 'income' ? '+' : '−'}{fmtIDR(t.amount)}
                  </div>
                  <div className="text-xs text-slate-400">{t.date}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
