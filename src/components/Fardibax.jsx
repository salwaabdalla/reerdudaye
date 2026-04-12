import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import VentCard from './VentCard'
import './Fardibax.css'

const MEMBERS  = ['Salwa', 'Sumaya', 'Zamzam', 'Dahraan', 'Adna', 'Hafsa', 'Rayan', 'Ramisa']
const REACTED_KEY = 'reer-dudaaye-reacted-vents'

// reactedVents shape: { [ventId]: Set<emoji> }
function loadReacted() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(REACTED_KEY)) || {}
    return Object.fromEntries(
      Object.entries(raw).map(([id, emojis]) => [id, new Set(emojis)])
    )
  } catch {
    return {}
  }
}

function saveReacted(obj) {
  const serialisable = Object.fromEntries(
    Object.entries(obj).map(([id, set]) => [id, [...set]])
  )
  sessionStorage.setItem(REACTED_KEY, JSON.stringify(serialisable))
}

export default function Fardibax() {
  const [vents, setVents]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [author, setAuthor]       = useState('')
  const [content, setContent]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [posted, setPosted]       = useState(false)
  const [reactedVents, setReactedVents] = useState(loadReacted)

  // ── Fetch + Realtime ───────────────────────────────────────
  useEffect(() => {
    async function fetchVents() {
      const { data, error } = await supabase
        .from('vents')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error) setVents(data || [])
      setLoading(false)
    }
    fetchVents()

    const channel = supabase
      .channel('vents-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vents' },
        ({ new: row }) => setVents(prev => [row, ...prev])
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vents' },
        ({ new: row }) => setVents(prev => prev.map(v => v.id === row.id ? row : v))
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // ── Post vent ──────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!author)        return setError('⚠️ Dooro magacaaga!')
    if (!content.trim()) return setError('⚠️ Wax qor!')
    if (content.trim().length < 5) return setError('⚠️ Wax dheer qor!')

    setSubmitting(true)
    try {
      const { error } = await supabase.from('vents').insert({
        author,
        content: content.trim(),
        reactions: { '💀': 0, '😭': 0, '❤️': 0, '😂': 0 },
      })
      if (error) throw error
      setContent('')
      setAuthor('')
      setPosted(true)
      setTimeout(() => setPosted(false), 3000)
    } catch {
      setError('😱 Khalad ayaa dhacay. Mar kale isku day!')
    } finally {
      setSubmitting(false)
    }
  }

  // ── React ──────────────────────────────────────────────────
  async function handleReact(ventId, emoji) {
    const vent = vents.find(v => v.id === ventId)
    if (!vent) return

    // Optimistic local update
    setReactedVents(prev => {
      const next = { ...prev }
      next[ventId] = new Set(prev[ventId] || [])
      next[ventId].add(emoji)
      saveReacted(next)
      return next
    })

    const newReactions = {
      ...vent.reactions,
      [emoji]: (vent.reactions?.[emoji] ?? 0) + 1,
    }

    const { error } = await supabase
      .from('vents')
      .update({ reactions: newReactions })
      .eq('id', ventId)

    if (error) {
      // Roll back on failure
      setReactedVents(prev => {
        const next = { ...prev }
        if (next[ventId]) {
          next[ventId] = new Set(next[ventId])
          next[ventId].delete(emoji)
          saveReacted(next)
        }
        return next
      })
    }
  }

  return (
    <div className="fardibax fade-slide-up">
      <h2 className="section-title">💬 Fardibax</h2>
      <p className="vents-subtitle">
        🤫 Qarsoodi ama magacaaga — sheeg waxa qalbigaagu leeyahay!
      </p>

      {/* Post form */}
      <div className="vent-form-wrap card">
        {posted && (
          <div className="vent-success bounce-in">
            🎉 Sheekadaadii waa la daabacay! 💬✨
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>👤 Magacaaga</label>
            <select value={author} onChange={e => setAuthor(e.target.value)} disabled={submitting}>
              <option value="">— Dooro ama anonka —</option>
              <option value="Qarsoodi">🎭 Qarsoodi (Magac La'aan)</option>
              {MEMBERS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>💬 Sheekadaada</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Waxa qalbigaagu leeyahay... 😤💭"
              maxLength={500}
              rows={4}
              disabled={submitting}
            />
            <div className="char-count">{content.length}/500</div>
          </div>

          {error && <div className="error-msg shake">{error}</div>}

          <button type="submit" className="btn btn-primary submit-btn" disabled={submitting}>
            {submitting ? '⏳ La daabacayaa...' : '💬 Daabac Sheekada!'}
          </button>
        </form>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="loading-state">
          <span className="loading-emoji">💬</span>
          <p>Fardibax waa la soo rarayo...</p>
        </div>
      ) : vents.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <span className="emoji">🤫</span>
          <p>Weli fardibax ma jirto!</p>
          <p style={{ fontSize: '14px', marginTop: '8px', color: 'var(--text-light)' }}>
            Noqo kii ugu horeeyay ee wax sheega 👆
          </p>
        </div>
      ) : (
        <div className="vents-list">
          <p className="vents-count">
            💬 <strong>{vents.length}</strong> fardibax ayaa jirta
          </p>
          {vents.map(v => (
            <VentCard
              key={v.id}
              vent={v}
              onReact={handleReact}
              reactedVents={reactedVents}
            />
          ))}
        </div>
      )}
    </div>
  )
}
