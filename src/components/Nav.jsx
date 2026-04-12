import './Nav.css'

const TABS = [
  { id: 'active',      label: '⚖️ Dacwaadaha',      short: '⚖️ Dacwad'   },
  { id: 'submit',      label: '📝 Gudbisoo',         short: '📝 Gudbisoo' },
  { id: 'fardibax',label: '💬 Fardibax',     short: '💬 Fardibax'   },
  { id: 'shame',       label: '💀 Kan u Ceeb Badan', short: '💀 Ceebta'   },
  { id: 'history',     label: '📜 Taariikhda',       short: '📜 Taariikh' },
]

export default function Nav({ tab, setTab, activeCnt }) {
  return (
    <nav className="nav">
      {TABS.map(t => (
        <button
          key={t.id}
          className={`nav-btn ${tab === t.id ? 'active' : ''}`}
          onClick={() => setTab(t.id)}
        >
          <span className="nav-label-full">{t.label}</span>
          <span className="nav-label-short">{t.short}</span>
          {t.id === 'active' && activeCnt > 0 && (
            <span className="nav-badge">{activeCnt}</span>
          )}
        </button>
      ))}
    </nav>
  )
}
