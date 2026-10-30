import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReceiptText, Wallet } from 'lucide-react'
import api, { fmtIDR } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useHideBal } from '../context/BalContext.jsx'
import { Badge, Card } from '../components/ui.jsx'
import { BarChart, Bar, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const cssVar = (n, fb) => (getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb)
const INCOME_COLOR = '#2f7a45'
const EXPENSE_COLOR = '#1b1d1f'
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[10px] bg-ink px-3 py-2 text-xs font-medium text-white shadow-lg">
      {label && <div className="mb-1 text-white/70">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.payload.fill || p.color }} />
            {p.name}
          </span>
          <span className="tnum font-semibold">{fmtIDR(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function Empty({ icon, text, to, linkLabel }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">{icon}</span>
      <p className="text-sm text-slate-400">{text}</p>
      {to && (
        <Link to={to} className="text-sm font-medium text-accent hover:underline">{linkLabel}</Link>
      )}
    </div>
  )
}

export default function Dashboard() {
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
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState([])
  const [accts, setAccts] = useState([])

  useEffect(() => {
    const [y, m] = month.split('-').map(Number)
    api.get('/reports/summary', { params: { year: y, month: m } }).then((r) => setSummary(r.data)).catch(() => {})
    api.get('/transactions', { params: { limit: 6 } }).then((r) => setRecent(r.data.items)).catch(() => {})
  }, [month])

  useEffect(() => {
    api.get('/reports/accounts').then((r) => setAccts(r.data.accounts)).catch(() => {})
  }, [])

  const expenseByCat = (summary?.by_category || []).filter((c) => c.category?.kind === 'expense')
  const totalBal = accts.reduce((s, a) => s + a.balance, 0)
  const fmtM = (n) => (hide ? 'Rp ••••••' : fmtIDR(n))

  const compare = [
    { name: 'Pemasukan', value: summary?.total_income || 0, fill: incCol },
    { name: 'Pengeluaran', value: summary?.total_expense || 0, fill: expCol }
  ]

  const firstName = (profile?.name || 'Kawan').trim().split(/\s+/)[0]
  const [yy, mm] = month.split('-').map(Number)
  const monthLabel = `${MONTHS[mm - 1]} ${yy}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Halo, {firstName}</h1>
          <p className="text-sm text-slate-400">Rekap keuangan • {monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-10 rounded-[10px] border border-slate-300 bg-white px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="animate-rise">
          <p className="text-sm text-slate-500">Pemasukan bulan {monthLabel}</p>
          <p className="mt-1 text-2xl font-semibold text-up tnum">{fmtM(summary?.total_income)}</p>
        </Card>
        <Card className="animate-rise" style={{ animationDelay: '60ms' }}>
          <p className="text-sm text-slate-500">Pengeluaran bulan {monthLabel}</p>
          <p className="mt-1 text-2xl font-semibold text-ink tnum">{fmtM(summary?.total_expense)}</p>
        </Card>
        <Card className="animate-rise" style={{ animationDelay: '120ms' }}>
          <p className="text-sm text-slate-500">Saldo bulan {monthLabel}</p>
          <p className={`mt-1 text-2xl font-semibold tnum ${(summary?.balance ?? 0) >= 0 ? 'text-ink' : 'text-down'}`}>
            {fmtM(summary?.balance)}
          </p>
        </Card>
      </div>

      <Card className="animate-rise" style={{ animationDelay: '120ms' }}>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Saldo per akun</h2>
        {accts.length === 0 ? (
          <Empty icon={<Wallet size={18} />} text="Belum ada rekening." to="/accounts" linkLabel="Tambah rekening" />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {accts.map((r) => (
                <li key={r.account.id} className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-3 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.account.color }} />
                    {r.account.name}
                    <span className="text-xs text-slate-400">({r.account.type === 'cash' ? 'Tunai' : r.account.type === 'ewallet' ? 'E-Wallet' : 'Bank'})</span>
                  </span>
                  <span className={`text-sm font-semibold tnum ${r.balance >= 0 ? 'text-slate-800' : 'text-down'}`}>
                    {fmtM(r.balance)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 pr-14 md:pr-0">
              <span className="text-sm font-medium text-slate-500">Total saldo</span>
              <span className={`text-base font-bold tnum ${totalBal >= 0 ? 'text-slate-900' : 'text-down'}`}>
                {fmtM(totalBal)}
              </span>
            </div>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="animate-rise" style={{ animationDelay: '180ms' }}>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Pemasukan vs pengeluaran</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compare} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5c6064' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(120,130,145,0.08)' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {compare.map((c, i) => <Cell key={i} fill={c.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="animate-rise" style={{ animationDelay: '240ms' }}>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Pengeluaran per kategori</h2>
          {expenseByCat.length === 0 ? (
            <Empty icon={<ReceiptText size={18} />} text="Belum ada data pengeluaran bulan ini." />
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseByCat} dataKey="total" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {expenseByCat.map((c, i) => (
                        <Cell key={i} fill={c.category.color} />
                      ))}
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
      </div>

      <Card className="animate-rise" style={{ animationDelay: '300ms' }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Transaksi terbaru</h2>
          <Link to="/transactions" className="text-sm font-medium text-accent hover:underline">Lihat semua</Link>
        </div>
        {recent.length === 0 ? (
          <Empty icon={<ReceiptText size={18} />} text="Belum ada transaksi." to="/transactions" linkLabel="Catat transaksi pertama" />
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {t.category ? <Badge color={t.category.color}>{t.category.name}</Badge> : <Badge color="#94a3b8">Tanpa kategori</Badge>}
                  {t.account && <Badge color={t.account.color}>{t.account.name}</Badge>}
                  <span className="text-sm text-slate-600">{t.note || (t.kind === 'income' ? 'Pemasukan' : 'Pengeluaran')}</span>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold tnum ${t.kind === 'income' ? 'text-up' : 'text-ink'}`}>
                    {t.kind === 'income' ? '+' : '−'}{fmtIDR(t.amount)}
                  </div>
                  <div className="text-xs text-slate-400">{t.date}{t.time ? ` · ${t.time}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
