import { useState } from 'react'
import './SubmitCase.css'

const MEMBERS = ['Salwa', 'Sumaya', 'Zamzam', 'Dahraan', 'Adna', 'Hafsa', 'Rayan', 'Ramisa']

export default function SubmitCase({ onSubmit, totalCases }) {
  const [accused, setAccused]     = useState('')
  const [prosecutor, setProsecutor] = useState('')
  const [crime, setCrime]         = useState('')
  const [error, setError]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!accused)        return setError('⚠️ Fadlan dooro eedeysanaha!')
    if (!prosecutor)     return setError('⚠️ Fadlan dooro dacwad-qaadaha!')
    if (!crime.trim())   return setError('⚠️ Fadlan qor dembigu waa maxay!')
    if (accused === prosecutor) return setError('⚠️ Qofku isagii ma eedeyn karo naftiisa! 😂')

    setSubmitting(true)
    try {
      await onSubmit({ accused, prosecutor, crime: crime.trim() })
      setAccused('')
      setProsecutor('')
      setCrime('')
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    } catch {
      setError('😱 Khalad ayaa dhacay. Mar kale isku day!')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="submit-case fade-slide-up">
      <h2 className="section-title">📝 Gudbisoo Dacwad</h2>

      {submitted && (
        <div className="success-banner bounce-in">
          🎉 Dacwadda si guul leh ayaa loo gudbiyay! Maxkamaddu waxay ka shaqeynaysaa! ⚖️
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>👤 Eedeysanaha (Suspect)</label>
            <select value={accused} onChange={e => setAccused(e.target.value)} disabled={submitting}>
              <option value="">— Dooro qofka la eedeynayo —</option>
              {MEMBERS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>👩‍⚖️ Dacwad-qaadaha (Prosecutor)</label>
            <select value={prosecutor} onChange={e => setProsecutor(e.target.value)} disabled={submitting}>
              <option value="">— Dooro dacwad-qaadaha —</option>
              {MEMBERS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>🔍 Dembigu waa (Dacwadda)</label>
            <textarea
              value={crime}
              onChange={e => setCrime(e.target.value)}
              placeholder="Qor dembigu waa maxay... (tusaale: Waxay cuntay cuntada kooxda oo dhan 😤)"
              maxLength={300}
              disabled={submitting}
            />
            <div className="char-count">{crime.length}/300</div>
          </div>

          {error && (
            <div className="error-msg shake">{error}</div>
          )}

          <button type="submit" className="btn btn-primary submit-btn" disabled={submitting}>
            {submitting ? '⏳ La gudbinayaa...' : '🔨 Gudbisoo Dacwadda!'}
          </button>
        </form>
      </div>

      <div className="case-count-note">
        📊 Wadarta dacwaadaha: <strong>{totalCases}</strong> — Maxkamadda waxay shaqeynaysaa! ⚖️
      </div>
    </div>
  )
}
