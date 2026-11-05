import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReceiptText, Wallet } from 'lucide-react'
import api, { fmtIDR } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useHideBal } from '../context/BalContext.jsx'
import { Badge, Card } from '../components/ui.jsx'
import PeriodNav from '../components/PeriodNav.jsx'
import { usePeriods } from '../lib/periods.js'
import { BarChart, Bar, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const cssVar = (n, fb) => (getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb)
const INCOME_COLOR = '#247b50'
const EXPENSE_COLOR = '#1d5fb6'
const MAX_BACK = 120

/* Tooltip: opaque ink box. Only thing that floats, so it may carry depth. */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[12px] bg-ink px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#1c1a15' }}>
      {label && <div className="mb-1 opacity-70">{label}</div>}
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
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-raised text-faint">{icon}</span>
      <p className="text-sm text-faint">{text}</p>
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
  const expCol = cssVar('--color-chart1', EXPENSE_COLOR)
  const [, bump] = useState(0)
  useEffect(() => {
    const h = () => bump((x) => x + 1)
    window.addEventListener('fundy-theme', h)
    return () => window.removeEventListener('fundy-theme', h)
  }, [])
  const [back, setBack] = useState(0)
  const periods = usePeriods(back + 1, profile?.salary_day, profile?.salary_end_of_month)
  const period = periods[back] || null
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState([])
  const [accts, setAccts] = useState([])

  useEffect(() => {
    if (!period) return
    let alive = true
    setSummary(null)
    api.get('/reports/summary', { params: { start: period.start, end: period.end } })
      .then((r) => { if (alive) setSummary(r.data) })
      .catch(() => {})
    return () => { alive = false }
  }, [period?.start, period?.end])

  useEffect(() => {
    api.get('/transactions', { params: { limit: 6 } }).then((r) => setRecent(r.data.items)).catch(() => {})
  }, [])

  useEffect(() => {
    api.get('/reports/accounts').then((r) => setAccts(r.data.accounts)).catch(() => {})
  }, [])

  const expenseByCat = (summary?.by_category || []).filter((c) => c.category?.kind === 'expense')
  const totalBal = accts.reduce((s, a) => s + a.balance, 0)
  const fmtM = (n) => (hide ? 'Rp ••••••' : fmtIDR(n))

  /* Main data element carries the one hue (blue = spending). Income green, ink otherwise. */
  const compare = [
    { name: 'Pemasukan', value: summary?.total_income || 0, fill: incCol },
    { name: 'Pengeluaran', value: summary?.total_expense || 0, fill: expCol }
  ]

  const balance = summary?.balance ?? 0
  const firstName = (profile?.name || 'Kawan').trim().split(/\s+/)[0]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Dashboard</h1>
          <p className="mt-0.5 text-sm text-sub">Halo {firstName}. {period?.label ?? '…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodNav
            period={period}
            back={back}
            onOlder={() => setBack((b) => Math.min(b + 1, MAX_BACK))}
            onNewer={() => setBack((b) => Math.max(b - 1, 0))}
          />
        </div>
      </div>

      {/* Hero answer: net balance leads at 32px. Biggest number answers the title. */}
      <div className="animate-rise rounded-[20px] bg-ink p-5 text-white dark:bg-[#f2f3ef] dark:text-[#101210]">
        <p className="text-[13px] font-medium opacity-70">Saldo periode ini</p>
        <p className={`mt-1 text-[32px] font-bold leading-tight tnum ${balance < 0 ? 'text-down' : ''}`}>
          {fmtM(balance)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[12px] bg-white/15 px-3.5 py-3 dark:bg-black/5">
            <p className="text-[13px] font-medium opacity-70">Masuk</p>
            <p className="mt-0.5 text-lg font-semibold text-white tnum dark:text-[#101210]">{fmtM(summary?.total_income)}</p>
          </div>
          <div className="rounded-[12px] bg-white/15 px-3.5 py-3 dark:bg-black/5">
            <p className="text-[13px] font-medium opacity-70">Keluar</p>
            <p className="mt-0.5 text-lg font-semibold text-white tnum dark:text-[#101210]">{fmtM(summary?.total_expense)}</p>
          </div>
        </div>
      </div>

      <Card className="animate-rise" style={{ animationDelay: '60ms' }}>
        <h2 className="mb-1">Saldo per akun</h2>
        {accts.length === 0 ? (
          <Empty icon={<Wallet size={18} />} text="Belum ada rekening." to="/accounts" linkLabel="Tambah rekening" />
        ) : (
          <>
            <ul className="space-y-1">
              {accts.map((r) => (
                <li key={r.account.id} className="flex items-center justify-between rounded-[12px] bg-raised px-3.5 py-3 dark:bg-[#1e211c]">
                  <span className="flex min-w-0 items-center gap-3 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.account.color }} />
                    <span className="truncate font-medium text-ink">{r.account.name}</span>
                    <span className="text-xs text-faint">({r.account.type === 'cash' ? 'Tunai' : r.account.type === 'ewallet' ? 'E-Wallet' : 'Bank'})</span>
                  </span>
                  <span className={`shrink-0 text-sm font-semibold tnum ${r.balance >= 0 ? 'text-ink' : 'text-down'}`}>
                    {fmtM(r.balance)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between rounded-[12px] bg-active px-3.5 py-3 dark:bg-[#262923]">
              <span className="text-sm font-medium text-sub">Total saldo</span>
              <span className={`text-base font-bold tnum ${totalBal >= 0 ? 'text-ink' : 'text-down'}`}>
                {fmtM(totalBal)}
              </span>
            </div>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="animate-rise" style={{ animationDelay: '120ms' }}>
          <h2>Masuk lawan keluar</h2>
          <p className="mb-3 text-xs text-faint">Periode {period?.label ?? 'ini'}</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compare} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6e6a5f' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(120,130,145,0.08)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {compare.map((c, i) => <Cell key={i} fill={c.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="animate-rise" style={{ animationDelay: '180ms' }}>
          <h2>Keluar per kategori</h2>
          <p className="mb-3 text-xs text-faint">Periode {period?.label ?? 'ini'}</p>
          {expenseByCat.length === 0 ? (
            <Empty icon={<ReceiptText size={18} />} text="Belum ada data pengeluaran periode ini." />
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseByCat} dataKey="total" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                      {expenseByCat.map((c, i) => (
                        <Cell key={i} fill={c.category.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-0.5">
                {expenseByCat.map((c) => (
                  <div key={c.category.id} className="flex items-center justify-between rounded-[8px] px-2 py-1.5 text-sm hover:bg-raised">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.category.color }} />
                      <span className="truncate">{c.category.name}</span>
                    </span>
                    <span className="shrink-0 font-medium text-ink tnum">{fmtIDR(c.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <Card className="animate-rise" style={{ animationDelay: '240ms' }}>
        <div className="mb-2 flex items-center justify-between">
          <h2>Transaksi terbaru</h2>
          <Link to="/transactions" className="flex min-h-[44px] items-center text-sm font-medium text-accent hover:underline">Lihat semua</Link>
        </div>
        {recent.length === 0 ? (
          <Empty icon={<ReceiptText size={18} />} text="Belum ada transaksi." to="/transactions" linkLabel="Catat transaksi pertama" />
        ) : (
          <div className="space-y-1">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-[12px] px-2 py-2.5 hover:bg-raised">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {t.category ? <Badge color={t.category.color}>{t.category.name}</Badge> : <Badge color="#8a877d">Tanpa kategori</Badge>}
                  {t.account && <Badge color={t.account.color}>{t.account.name}</Badge>}
                  <span className="w-full truncate text-sm text-sub">{t.note || (t.kind === 'income' ? 'Pemasukan' : t.kind === 'transfer' ? 'Pindah dana' : 'Pengeluaran')}</span>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-sm font-semibold tnum ${t.kind === 'income' ? 'text-up' : 'text-ink'}`}>
                    {t.kind === 'income' ? '+' : '−'}{fmtIDR(t.amount)}
                  </div>
                  <div className="text-xs text-faint">{t.date}{t.time ? ` · ${t.time}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
