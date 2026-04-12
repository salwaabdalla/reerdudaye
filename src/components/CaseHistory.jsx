import CaseCard from './CaseCard'
import './CaseHistory.css'

export default function CaseHistory({ cases }) {
  if (cases.length === 0) {
    return (
      <div className="fade-slide-up">
        <h2 className="section-title">📜 Taariikhda Dacwaadaha</h2>
        <div className="empty-state">
          <span className="emoji">📜</span>
          <p>Ma jiraan dacwaado la xidhay weli!</p>
          <p style={{ fontSize: '14px', marginTop: '8px', color: 'var(--text-light)' }}>
            Dacwaadaha xidhnaanayaan marka 3 cod ama ka badan la helo ⚖️
          </p>
        </div>
      </div>
    )
  }

  const guiltyCount = cases.filter(c => c.verdict === 'dembi-leh').length
  const innocentCount = cases.filter(c => c.verdict === 'dembi-maleh').length

  return (
    <div className="case-history fade-slide-up">
      <h2 className="section-title">📜 Taariikhda Dacwaadaha</h2>

      <div className="history-stats">
        <div className="stat-box stat-total">
          <span className="stat-num">{cases.length}</span>
          <span className="stat-label">Wadarta</span>
        </div>
        <div className="stat-box stat-guilty">
          <span className="stat-num">{guiltyCount}</span>
          <span className="stat-label">🔴 Dembi Leh</span>
        </div>
        <div className="stat-box stat-innocent">
          <span className="stat-num">{innocentCount}</span>
          <span className="stat-label">🟢 Xoroobay</span>
        </div>
      </div>

      <div className="history-list">
        {cases.map(c => (
          <CaseCard key={c.id} caseData={c} onVote={() => {}} showVoting={false} />
        ))}
      </div>
    </div>
  )
}
