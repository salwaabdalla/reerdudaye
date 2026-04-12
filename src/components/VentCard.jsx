import { useState } from 'react'
import './VentCard.css'

const EMOJIS = ['💀', '😭', '❤️', '😂']

export default function VentCard({ vent, onReact, reactedVents }) {
  const [reacting, setReacting] = useState(null)

  const date = new Date(vent.created_at).toLocaleDateString('so-SO', {
    month: 'short', day: 'numeric',
  })
  const time = new Date(vent.created_at).toLocaleTimeString('so-SO', {
    hour: '2-digit', minute: '2-digit',
  })

  const reactedEmojis = reactedVents[vent.id] || new Set()

  async function handleReact(emoji) {
    if (reactedEmojis.has(emoji) || reacting) return
    setReacting(emoji)
    await onReact(vent.id, emoji)
    setReacting(null)
  }

  const isAnon = vent.author === 'Qarsoodi'

  return (
    <div className="vent-card fade-slide-up">
      <div className="vent-header">
        <div className="vent-author">
          <span className="author-avatar">{isAnon ? '🎭' : '👤'}</span>
          <span className={`author-name ${isAnon ? 'author-anon' : ''}`}>
            {vent.author}
          </span>
          {isAnon && <span className="anon-tag">Qarsoodi</span>}
        </div>
        <div className="vent-time">
          <span>{date}</span>
          <span>{time}</span>
        </div>
      </div>

      <p className="vent-content">{vent.content}</p>

      <div className="vent-reactions">
        {EMOJIS.map(emoji => {
          const count     = vent.reactions?.[emoji] ?? 0
          const hasReacted = reactedEmojis.has(emoji)
          const isLoading  = reacting === emoji
          return (
            <button
              key={emoji}
              className={`react-btn ${hasReacted ? 'reacted' : ''} ${isLoading ? 'loading' : ''}`}
              onClick={() => handleReact(emoji)}
              disabled={hasReacted || reacting !== null}
              title={hasReacted ? 'Hore u falcelisay' : 'Falceli'}
            >
              <span className="react-emoji">{emoji}</span>
              {count > 0 && <span className="react-count">{count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
