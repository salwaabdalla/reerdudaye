import { useState, useEffect } from 'react'
import './SplashScreen.css'

const FLOATERS = [
  { emoji: '⚖️', style: { top: '8%', left: '7%', animationDelay: '0s', animationDuration: '4s', fontSize: '2.4rem' } },
  { emoji: '👩‍⚖️', style: { top: '15%', right: '9%', animationDelay: '0.6s', animationDuration: '5s', fontSize: '2.8rem' } },
  { emoji: '💅', style: { top: '40%', left: '4%', animationDelay: '1.2s', animationDuration: '4.5s', fontSize: '2rem' } },
  { emoji: '🔨', style: { bottom: '20%', right: '6%', animationDelay: '0.3s', animationDuration: '3.8s', fontSize: '2.2rem' } },
  { emoji: '💖', style: { bottom: '30%', left: '10%', animationDelay: '0.9s', animationDuration: '5.2s', fontSize: '1.8rem' } },
  { emoji: '👑', style: { top: '60%', right: '12%', animationDelay: '1.5s', animationDuration: '4.2s', fontSize: '2rem' } },
  { emoji: '✨', style: { top: '25%', left: '20%', animationDelay: '0.4s', animationDuration: '3.5s', fontSize: '1.6rem' } },
  { emoji: '✨', style: { bottom: '15%', right: '25%', animationDelay: '1.8s', animationDuration: '4.8s', fontSize: '1.4rem' } },
  { emoji: '💕', style: { top: '72%', left: '30%', animationDelay: '2.1s', animationDuration: '5.5s', fontSize: '1.5rem' } },
  { emoji: '🌸', style: { top: '5%', left: '50%', animationDelay: '0.7s', animationDuration: '4.3s', fontSize: '1.8rem' } },
]

export default function SplashScreen({ onEnter }) {
  const [leaving, setLeaving] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger entrance animation after mount
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  function handleEnter() {
    setLeaving(true)
    setTimeout(onEnter, 700)
  }

  return (
    <div className={`splash ${visible ? 'splash-visible' : ''} ${leaving ? 'splash-leaving' : ''}`}>
      {/* Floating background emojis */}
      {FLOATERS.map((f, i) => (
        <span key={i} className="floater" style={f.style}>
          {f.emoji}
        </span>
      ))}

      {/* Decorative circles */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="splash-content">
        <div className="splash-gavel">🔨</div>

        <div className="splash-welcome">Ku soo dhawow</div>

        <h1 className="splash-title">
          Reer Dudaaye
        </h1>

        <div className="splash-divider">
          <span>⚖️</span><span>💅</span><span>⚖️</span>
        </div>

        <p className="splash-subtitle">
          Caddaaladda waa la helayaa... 💖
        </p>

        <p className="splash-tagline">
          👩‍⚖️ Maxkamadda Saaxiibada Ugu Caan Baxday 👩‍⚖️
        </p>

        <button className="splash-btn" onClick={handleEnter}>
          Gal Maxkamadda ⚖️
        </button>

        <p className="splash-warning">
          ⚠️ Dignaanshaha: Dembigu halkaan kama baxo! 💀
        </p>
      </div>
    </div>
  )
}
