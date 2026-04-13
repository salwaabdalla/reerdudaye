import { useState } from 'react'
import MafiaGame from './MafiaGame'
import './CiyaarahaTab.css'

const GAMES = [
  {
    id: 'mafia',
    emoji: '🔪',
    label: 'Mafia',
    desc: '2 Mafia vs 6 Shacab — 8 ciyaartoy',
    ready: true,
  },
  {
    id: 'truth',
    emoji: '🎯',
    label: 'Run ama Beenlow',
    desc: 'Dhawaan... ✨',
    ready: false,
  },
  {
    id: 'dare',
    emoji: '🃏',
    label: 'Dambe',
    desc: 'Dhawaan... ✨',
    ready: false,
  },
]

export default function CiyaarahaTab() {
  const [activeGame, setActiveGame] = useState(null)

  if (activeGame === 'mafia') {
    return <MafiaGame onBack={() => setActiveGame(null)} />
  }

  return (
    <div className="ciyaaraha fade-slide-up">
      <h2 className="section-title">🎮 Ciyaaraha</h2>
      <p className="ciyaaraha-subtitle">
        Dooro ciyaarta — xaflada ha bilaabato! 🎉
      </p>
      <div className="games-grid">
        {GAMES.map(g => (
          <button
            key={g.id}
            className={`game-card ${!g.ready ? 'game-coming-soon' : ''}`}
            onClick={() => g.ready && setActiveGame(g.id)}
            disabled={!g.ready}
          >
            <span className="game-emoji">{g.emoji}</span>
            <span className="game-label">{g.label}</span>
            <span className="game-desc">{g.desc}</span>
            {!g.ready && <span className="soon-badge">Dhawaan</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
