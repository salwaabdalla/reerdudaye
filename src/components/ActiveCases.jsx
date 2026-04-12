import CaseCard from './CaseCard'
import './ActiveCases.css'

export default function ActiveCases({ cases, onVote, votedCases }) {
  if (cases.length === 0) {
    return (
      <div className="fade-slide-up">
        <h2 className="section-title">⚖️ Dacwaadaha Socda</h2>
        <div className="empty-state">
          <span className="emoji">⚖️</span>
          <p>Ma jiraan dacwaado hadda! 😌</p>
          <p style={{ fontSize: '14px', marginTop: '8px', color: 'var(--text-light)' }}>
            Saaxiibkaaga wax xun ayuu kugu sameeyay? Gudbi dacwad! 📝
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="active-cases fade-slide-up">
      <h2 className="section-title">⚖️ Dacwaadaha Socda</h2>
      <p className="cases-count">
        🔥 <strong>{cases.length}</strong> dacwaad ayaa sugaya garsoorka!
      </p>
      <div className="cases-list">
        {cases.map(c => (
          <CaseCard
            key={c.id}
            caseData={c}
            onVote={onVote}
            votedCases={votedCases}
          />
        ))}
      </div>
    </div>
  )
}
