import { useState } from 'react'
import { Bell, Landmark, Settings, Tags } from 'lucide-react'
import Accounts from './Accounts.jsx'
import Categories from './Categories.jsx'
import Reminders from './Reminders.jsx'
import SettingsPage from './Settings.jsx'

const TABS = [
  { id: 'accounts', label: 'Rekening', icon: <Landmark size={18} strokeWidth={1.8} /> },
  { id: 'categories', label: 'Kategori', icon: <Tags size={18} strokeWidth={1.8} /> },
  { id: 'reminders', label: 'Pengingat', icon: <Bell size={18} strokeWidth={1.8} /> },
  { id: 'settings', label: 'Pengaturan', icon: <Settings size={18} strokeWidth={1.8} /> }
]

export default function DataMaster() {
  const [tab, setTab] = useState('accounts')
  return (
    <div className="space-y-4">
      <div>
        <h1>Data master</h1>
        <p className="mt-0.5 text-sm text-sub">Kelola rekening, kategori, dan pengingat.</p>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-[12px] bg-raised p-1 dark:bg-[#1a1d18]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-[8px] px-2 text-xs font-medium transition-colors sm:text-sm ${
              tab === t.id ? 'chip-active' : 'text-sub hover:text-ink'
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
      {tab === 'settings' && <SettingsPage />}
    </div>
  )
}
