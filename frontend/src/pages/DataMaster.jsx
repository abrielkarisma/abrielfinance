import { useState } from 'react'
import { Bell, Landmark, Tags } from 'lucide-react'
import Accounts from './Accounts.jsx'
import Categories from './Categories.jsx'
import Reminders from './Reminders.jsx'

const TABS = [
  { id: 'accounts', label: 'Rekening', icon: <Landmark size={18} strokeWidth={1.8} /> },
  { id: 'categories', label: 'Kategori', icon: <Tags size={18} strokeWidth={1.8} /> },
  { id: 'reminders', label: 'Pengingat', icon: <Bell size={18} strokeWidth={1.8} /> }
]

export default function DataMaster() {
  const [tab, setTab] = useState('accounts')
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Data Master</h1>
        <p className="text-sm text-slate-400">Kelola rekening, kategori, dan pengingat.</p>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-[12px] border border-slate-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center justify-center gap-1.5 rounded-[10px] px-2 py-2 text-xs font-medium transition-colors sm:text-sm ${
              tab === t.id ? 'bg-accent-soft text-accent-ink' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'accounts' && <Accounts />}
      {tab === 'categories' && <Categories />}
      {tab === 'reminders' && <Reminders />}
    </div>
  )
}
