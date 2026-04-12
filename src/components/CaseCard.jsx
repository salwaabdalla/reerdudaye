import { useState } from 'react'
import './CaseCard.css'

const VERDICT_MESSAGES = {
  'dembi-leh': [
    '🔨 DEMBI LEH! Maxkamaddu waxay go\'aamisay: GUILTY! 😤',
    '⚖️ Natiijadu waa: DEMBI LEH! Ciqaabta way xiga! 💅',
    '👩‍⚖️ Maxkamadda waxay ku dhawaaqday: DEMBI LEH!! 🚨',
  ],
  'dembi-maleh': [
    '🕊️ XORTA! Maxkamaddu waxay go\'aamisay: DEMBI MA LAHA! 🎉',
    '⚖️ Natiijadu waa: XOROOBAY! Dacwadda waa la diidey! 🌸',
    '👼 Maxkamadda waxay ku dhawaaqday: BAAQSOON! Barakaysan tahay! 💐',
  ],
}

function pickMessage(verdict) {
  const arr = VERDICT_MESSAGES[verdict]
  if (!arr) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function CaseCard({ caseData, onVote, votedCases = new Set(), showVoting = true }) {
  const { id, accused, prosecutor, crime, votes, verdict, createdAt } = caseData

  // Pick a stable verdict message for this card's lifetime
  const [verdictMsg] = useState(() => verdict !== 'sugaya' ? pickMessage(verdict) : null)
  const [voting, setVoting]     = useState(false)
  const [justVoted, setJustVoted] = useState(false)

  const hasVoted = votedCases.has(id)

  const total       = votes.guilty + votes.innocent
  const guiltyPct   = total > 0 ? Math.round((votes.guilty   / total) * 100) : 50
  const innocentPct = total > 0 ? 100 - guiltyPct : 50

  const date = new Date(createdAt).toLocaleDateString('so-SO', {
    month: 'short', day: 'numeric',
  })

  async function handleVote(type) {
    if (hasVoted || voting) return
    setVoting(true)
    setJustVoted(true)
    await onVote(id, type)
    setVoting(false)
    setTimeout(() => setJustVoted(false), 600)
  }

  function verdictBadge() {
    if (verdict === 'sugaya')    return <span className="badge badge-sugaya">⏳ Sugaya</span>
    if (verdict === 'dembi-leh') return <span className="badge badge-guilty">🔴 Dembi Leh</span>
    return <span className="badge badge-innocent">🟢 Dembi Ma Leh</span>
  }

  return (
    <div className={`case-card card ${justVoted ? 'bounce-in' : 'fade-slide-up'}`}>
      <div className="case-header">
        <div className="case-meta">
          <span className="case-number">📋 #{id.slice(-4)}</span>
          <span className="case-date">{date}</span>
        </div>
        {verdictBadge()}
      </div>

      <div className="case-accused">
        <span className="label">👤 Eedeysanaha:</span>
        <span className="accused-name">{accused}</span>
      </div>

      <div className="case-crime">
        <span className="label">🔍 Dembigu waa:</span>
        <p className="crime-text">"{crime}"</p>
      </div>

      <div className="case-prosecutor">
        <span className="label">👩‍⚖️ Dacwad-qaadaha:</span>
        <span className="prosecutor-name">{prosecutor}</span>
      </div>

      {showVoting && verdict === 'sugaya' && (
        <div className="voting-section">
          <p className="voting-label">🗳️ Sawirkaaga:</p>
          <div className="vote-buttons">
            <button
              className="btn btn-guilty"
              onClick={() => handleVote('guilty')}
              disabled={hasVoted || voting}
            >
              {voting ? '⏳' : '👩‍⚖️'} DEMBI LEH
            </button>
            <button
              className="btn btn-innocent"
              onClick={() => handleVote('innocent')}
              disabled={hasVoted || voting}
            >
              {voting ? '⏳' : '🕊️'} DEMBI MA LAHA
            </button>
          </div>
          {hasVoted && !justVoted && (
            <p className="voted-msg">✅ Cod-bixintaadii waa la qaatay! Mahadsanid! 💖</p>
          )}
        </div>
      )}

      {total > 0 && (
        <div className="vote-results">
          <div className="vote-bar-wrap">
            <div className="vote-bar-inner">
              <div className="vote-bar-guilty"   style={{ width: `${guiltyPct}%` }} />
              <div className="vote-bar-innocent" style={{ width: `${innocentPct}%` }} />
            </div>
          </div>
          <div className="vote-counts">
            <span className="count-guilty">🔴 {votes.guilty} codeeyay DEMBI LEH</span>
            <span className="count-innocent">🟢 {votes.innocent} codeeyay XOR</span>
          </div>
          <p className="total-votes">Wadarta codeeyayaasha: {total}</p>
        </div>
      )}

      {verdict !== 'sugaya' && (
        <div className={`verdict-banner ${verdict === 'dembi-leh' ? 'verdict-guilty' : 'verdict-innocent'} stamp`}>
          {verdictMsg || (verdict === 'dembi-leh' ? '🔨 DEMBI LEH!' : '🕊️ DEMBI MA LAHA!')}
        </div>
      )}
    </div>
  )
}
