import './HallOfShame.css'

const MEMBERS = ['Salwa', 'Sumaya', 'Zamzam', 'Dahraan', 'Adna', 'Hafsa', 'Rayan', 'Ramisa']

const RANK_EMOJIS = ['👑', '💀', '😈', '😤', '😬', '😅', '😇', '🌸']
const SHAME_MSGS = [
  'Dembi-qaadaha Kowaad! 🏆💀',
  'Dembi-qaadaha Labaad 😬',
  'Dembi-qaadaha Saddexaad 😤',
  'Weli way joogaan 😅',
  'Dhexdhexaad 🤷',
  'Waa la yaabaa 😇',
  'Ammaan badan 🌸',
  'Geesinimo! 💐',
]

export default function HallOfShame({ cases }) {
  const guiltyMap = {}
  MEMBERS.forEach(m => { guiltyMap[m] = 0 })
  cases.forEach(c => {
    if (c.verdict === 'dembi-leh') {
      guiltyMap[c.accused] = (guiltyMap[c.accused] || 0) + 1
    }
  })

  const ranked = MEMBERS
    .map(m => ({ name: m, guilty: guiltyMap[m] || 0 }))
    .sort((a, b) => b.guilty - a.guilty)

  const totalGuilty = ranked.reduce((s, r) => s + r.guilty, 0)

  return (
    <div className="hall-of-shame fade-slide-up">
      <h2 className="section-title">💀 Kan u Ceeb Badan</h2>
      <p className="shame-subtitle">
        ⚠️ Kuwa ugu badan ee dacwaadaha "Dembi Leh" — Ceebtu way ku dhacday! 😤
      </p>

      {totalGuilty === 0 && (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <span className="emoji">😇</span>
          <p>Wali ma jiraan cid dembi leh!</p>
          <p style={{ fontSize: '14px', marginTop: '8px', color: 'var(--text-light)' }}>
            Codbixinta dhici doonto marki dacwaadaha la guudbiyo 🗳️
          </p>
        </div>
      )}

      {totalGuilty > 0 && (
        <div className="leaderboard">
          {ranked.map((person, i) => (
            <div
              key={person.name}
              className={`leaderboard-row ${i === 0 ? 'top-shamer' : ''} ${person.guilty === 0 ? 'row-zero' : ''}`}
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <div className="rank-section">
                <span className="rank-emoji">{RANK_EMOJIS[i]}</span>
                <span className="rank-num">#{i + 1}</span>
              </div>
              <div className="person-section">
                <span className="person-name">{person.name}</span>
                <span className="shame-msg">{SHAME_MSGS[i]}</span>
              </div>
              <div className="guilty-section">
                <span className="guilty-count">{person.guilty}</span>
                <span className="guilty-label">dembi leh</span>
                {person.guilty > 0 && (
                  <div className="shame-bar">
                    <div
                      className="shame-bar-fill"
                      style={{
                        width: `${Math.min(100, (person.guilty / (ranked[0].guilty || 1)) * 100)}%`
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="shame-footer">
        <p>🔨 Wadarta "Dembi Leh": <strong>{totalGuilty}</strong> xukun</p>
        <p>Maxkamadda Reer Dudaaye waa qaanuun! ⚖️💅</p>
      </div>
    </div>
  )
}
