import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import './MafiaGame.css'

const MEMBERS = ['Salwa', 'Sumaya', 'Zamzam', 'Dahraan', 'Adna', 'Hafsa', 'Rayan', 'Ramisa']
const MY_NAME_KEY = 'mafia-my-name'

// ── Audio ─────────────────────────────────────────────────────

function playDawnAlarm() {
  try {
    const AudioCtx = window.AudioContext || /** @type {typeof AudioContext} */ (window['webkitAudioContext'])
    const ctx = new AudioCtx()

    function burst(startAt, freq1, freq2, duration) {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq1, ctx.currentTime + startAt)
      osc.frequency.linearRampToValueAtTime(freq2, ctx.currentTime + startAt + duration * 0.5)
      osc.frequency.linearRampToValueAtTime(freq1, ctx.currentTime + startAt + duration)
      gain.gain.setValueAtTime(0, ctx.currentTime + startAt)
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + startAt + 0.03)
      gain.gain.setValueAtTime(0.35, ctx.currentTime + startAt + duration - 0.04)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startAt + duration)
      osc.start(ctx.currentTime + startAt)
      osc.stop(ctx.currentTime + startAt + duration + 0.05)
    }

    // 4 rising siren bursts — each higher than the last
    burst(0.0, 440, 660, 0.5)
    burst(0.6, 500, 750, 0.5)
    burst(1.2, 560, 840, 0.5)
    burst(1.8, 660, 990, 0.6)
    // Final long wail
    burst(2.6, 880, 1100, 1.0)
  } catch {
    // Audio not available — silent fail
  }
}

// ── Helpers ───────────────────────────────────────────────────

function assignRoles() {
  const shuffled = [...MEMBERS].sort(() => Math.random() - 0.5)
  const mafiaSet = new Set(shuffled.slice(0, 2))
  return MEMBERS.map(name => ({
    name,
    role: mafiaSet.has(name) ? 'mafia' : 'civilian',
    alive: true,
    revealed: false,
  }))
}

function checkWinner(players) {
  const alive      = players.filter(p => p.alive)
  const mafiaAlive = alive.filter(p => p.role === 'mafia').length
  const civAlive   = alive.filter(p => p.role === 'civilian').length
  if (mafiaAlive === 0)       return 'civilians'
  if (mafiaAlive >= civAlive) return 'mafia'
  return null
}

function addLog(existing, round, message) {
  return [...(existing || []), { round, message, ts: new Date().toISOString() }]
}

// ── Main component ────────────────────────────────────────────

export default function MafiaGame({ onBack }) {
  const [game, setGame]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [myName, setMyName]   = useState(() => sessionStorage.getItem(MY_NAME_KEY))
  const [modal, setModal]     = useState(null)
  const prevPhaseRef          = useRef(null)

  // ── Fetch + Realtime ──────────────────────────────────────────
  useEffect(() => {
    async function fetchGame() {
      const { data, error } = await supabase
        .from('mafia_game')
        .select('*')
        .eq('id', 'singleton')
        .single()

      if (error) {
        const { data: ins } = await supabase
          .from('mafia_game')
          .insert({
            id: 'singleton', phase: 'lobby', players: [], round: 0,
            night_target: null, day_votes: {}, log: [], winner: null,
          })
          .select().single()
        setGame(ins)
      } else {
        setGame(data)
        prevPhaseRef.current = data.phase
      }
      setLoading(false)
    }
    fetchGame()

    const ch = supabase
      .channel('mafia-game')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'mafia_game', filter: 'id=eq.singleton' },
        ({ new: row }) => {
          setGame(prev => {
            prevPhaseRef.current = prev?.phase ?? null
            return row
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  // ── Play alarm when phase transitions to 'dawn' ───────────────
  useEffect(() => {
    if (!game) return
    if (game.phase === 'dawn' && prevPhaseRef.current !== 'dawn') {
      playDawnAlarm()
    }
    prevPhaseRef.current = game.phase
  }, [game?.phase])

  async function updateGame(updates) {
    const { error } = await supabase
      .from('mafia_game')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', 'singleton')
    if (error) console.error(error)
  }

  // ── Actions ───────────────────────────────────────────────────

  async function startGame() {
    const players = assignRoles()
    await updateGame({
      phase: 'role-reveal', players, round: 1,
      night_target: null, day_votes: {},
      log: addLog([], 0, '🎮 Ciyaarta waa bilaabatay! Doorarka la qaybinayaa...'),
      winner: null,
    })
  }

  async function resetGame() {
    sessionStorage.removeItem(MY_NAME_KEY)
    setMyName(null)
    setModal(null)
    await updateGame({
      phase: 'lobby', players: [], round: 0,
      night_target: null, day_votes: {}, log: [], winner: null,
    })
  }

  function revealRole(name) {
    if (!game) return
    const player = game.players.find(p => p.name === name)
    if (!player) return

    const identity = myName || name
    if (!myName) {
      sessionStorage.setItem(MY_NAME_KEY, name)
      setMyName(name)
    }
    if (identity !== name) return

    const partner = player.role === 'mafia'
      ? game.players.find(p => p.role === 'mafia' && p.name !== name)
      : null
    setModal({ name, role: player.role, partner: partner?.name })

    if (!player.revealed) {
      updateGame({
        players: game.players.map(p => p.name === name ? { ...p, revealed: true } : p)
      })
    }
  }

  async function startNight() {
    await updateGame({ phase: 'night' })
  }

  async function submitNightKill(targetName) {
    if (!game || game.phase !== 'night') return
    const newPlayers = game.players.map(p =>
      p.name === targetName ? { ...p, alive: false } : p
    )
    const winner     = checkWinner(newPlayers)
    const killedRole = game.players.find(p => p.name === targetName)?.role
    const log        = addLog(game.log, game.round,
      `🌙 Habeenkii, ${targetName} (${killedRole === 'mafia' ? 'Mafia 🔪' : 'Shacab 👥'}) waa la dilay 💀`)

    // → 'dawn' for the wake-up announcement (or gameover if already decided)
    await updateGame({
      phase:        winner ? 'gameover' : 'dawn',
      players:      newPlayers,
      night_target: targetName,
      day_votes:    {},
      log,
      winner:       winner || null,
    })
  }

  async function advanceToDay() {
    if (!game || game.phase !== 'dawn') return
    await updateGame({ phase: 'day' })
  }

  async function submitDayVote(targetName) {
    if (!game || !myName) return
    await updateGame({ day_votes: { ...(game.day_votes || {}), [myName]: targetName } })
  }

  async function closeVoting() {
    if (!game) return
    const votes  = game.day_votes || {}
    const tally  = {}
    Object.values(votes).forEach(t => { tally[t] = (tally[t] || 0) + 1 })
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1])
    if (!sorted.length) return

    const topCount  = sorted[0][1]
    const tied      = sorted.filter(([, c]) => c === topCount).map(([n]) => n)
    const eliminated = tied[Math.floor(Math.random() * tied.length)]

    const elPlayer   = game.players.find(p => p.name === eliminated)
    const newPlayers = game.players.map(p =>
      p.name === eliminated ? { ...p, alive: false } : p
    )
    const winner = checkWinner(newPlayers)
    const log    = addLog(game.log, game.round,
      `☀️ Shacabku waxay codeeyeen ${eliminated} — ahaa ${elPlayer?.role === 'mafia' ? 'Mafia 🔪' : 'Shacab 👥'}`)

    await updateGame({
      phase:        winner ? 'gameover' : 'night',
      players:      newPlayers,
      round:        winner ? game.round : game.round + 1,
      night_target: null,
      day_votes:    {},
      log,
      winner:       winner || null,
    })
  }

  // ── Derived ───────────────────────────────────────────────────

  const me           = game?.players?.find(p => p.name === myName) ?? null
  const alivePlayers = game?.players?.filter(p => p.alive) ?? []
  const voteCount    = Object.keys(game?.day_votes ?? {}).length
  const canClose     = voteCount >= Math.ceil(alivePlayers.length / 2)
  const isNight      = game?.phase === 'night' || game?.phase === 'dawn'

  // ── Render ────────────────────────────────────────────────────

  if (loading) return (
    <div className="mafia-loading">
      <span>🎮</span>
      <p>Ciyaarta waa la soo rarayo...</p>
    </div>
  )
  if (!game) return null

  return (
    <div className={`mafia-wrap ${isNight ? 'is-night' : 'is-day'}`}>

      {/* Top bar */}
      <div className="mafia-topbar">
        <button className="mafia-back-btn" onClick={onBack}>← Ciyaaraha</button>
        <span className="mafia-phase-badge">
          {game.phase === 'lobby'       && '🎮 Lobby'}
          {game.phase === 'role-reveal' && '🃏 Doorarka'}
          {game.phase === 'night'       && `🌙 Habeenka ${game.round}`}
          {game.phase === 'dawn'        && `🌅 Baroorta`}
          {game.phase === 'day'         && `☀️ Maalinta ${game.round}`}
          {game.phase === 'gameover'    && '🏆 Dhammaad'}
        </span>
        {game.phase !== 'lobby' && game.phase !== 'gameover' && (
          <button className="mafia-reset-sm" onClick={resetGame} title="Dib u bilow">🔄</button>
        )}
        {(game.phase === 'lobby' || game.phase === 'gameover') && <span style={{ width: 36 }} />}
      </div>

      {/* Dawn fullscreen announcement — shown on ALL phones simultaneously */}
      {game.phase === 'dawn' && (
        <DawnAnnouncement
          killed={game.night_target}
          killedRole={game.players.find(p => p.name === game.night_target)?.role}
          onAdvance={advanceToDay}
        />
      )}

      {/* Role modal */}
      {modal && (
        <div className="role-modal-overlay" onClick={() => setModal(null)}>
          <div
            className={`role-modal-card ${modal.role === 'mafia' ? 'modal-mafia' : 'modal-civilian'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-big-icon">{modal.role === 'mafia' ? '🔪' : '👥'}</div>
            <h2 className="modal-name">{modal.name}</h2>
            <div className="modal-role-label">
              {modal.role === 'mafia' ? 'MAFIA 🔪' : 'SHACAB 👥'}
            </div>
            <p className="modal-desc">
              {modal.role === 'mafia'
                ? `Adiga waxaad tahay MAFIA! 🔪\nSaaxiibkaaga sirta ah waa ${modal.partner ?? '?'}!\nLa shaqee si aad u guulaysataan!`
                : 'Adiga waxaad tahay Shacabka! 👥\nMafia ka difaac — maalinta si fiican u codee!'}
            </p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setModal(null)}>
              Fahmay ✓
            </button>
          </div>
        </div>
      )}

      {/* Phase screens */}
      {game.phase === 'lobby' && <PhaseLobby onStart={startGame} />}

      {game.phase === 'role-reveal' && (
        <PhaseRoleReveal game={game} myName={myName} onReveal={revealRole} onStartNight={startNight} />
      )}

      {game.phase === 'night' && (
        <PhaseNight game={game} myName={myName} me={me} onKill={submitNightKill} />
      )}

      {game.phase === 'day' && (
        <PhaseDay
          game={game} myName={myName} me={me}
          voteCount={voteCount} canClose={canClose}
          onVote={submitDayVote} onClose={closeVoting}
        />
      )}

      {game.phase === 'gameover' && (
        <PhaseGameOver game={game} onReset={resetGame} />
      )}

      {/* Live log */}
      {(game.phase === 'day' || game.phase === 'night') && !!game.log?.length && (
        <GameLog log={game.log} />
      )}
    </div>
  )
}

// ── Dawn Announcement (fullscreen, all phones) ────────────────

function DawnAnnouncement({ killed, killedRole, onAdvance }) {
  const [countdown, setCountdown] = useState(6)
  const [advancing, setAdvancing] = useState(false)
  const advancedRef = useRef(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer)
          if (!advancedRef.current) {
            advancedRef.current = true
            onAdvance()
          }
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  async function handleDismiss() {
    if (advancing || advancedRef.current) return
    advancedRef.current = true
    setAdvancing(true)
    await onAdvance()
  }

  const isKilledMafia = killedRole === 'mafia'

  return (
    <div className="dawn-overlay">
      <div className="dawn-inner bounce-in">

        <div className="dawn-eyes">👀</div>

        <div className="dawn-soo-kaca">SOO KACA!</div>

        <div className="dawn-skull-wrap">
          <span className="dawn-skull">💀</span>
        </div>

        <h1 className="dawn-name">{killed}</h1>

        <p className="dawn-message">
          ayaa xalay la dilay!
        </p>

        <div className="dawn-role-reveal">
          {isKilledMafia
            ? '🔪 Waxa ahaa MAFIA!'
            : '👥 Waxa ahaa Shacab!'}
        </div>

        <div className="dawn-sub">
          Maxkamadda waxay go'aamisay — hadda codeeysta 🗳️
        </div>

        <button
          className="dawn-btn"
          onClick={handleDismiss}
          disabled={advancing}
        >
          {advancing ? '⏳' : `Haye, Fahmay! (${countdown})`}
        </button>

        <div className="dawn-bar-wrap">
          <div
            className="dawn-bar-fill"
            style={{ animationDuration: '6s' }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Phase: Lobby ──────────────────────────────────────────────

function PhaseLobby({ onStart }) {
  return (
    <div className="mafia-phase">
      <div className="lobby-hero">
        <span className="lobby-icon">🔪</span>
        <h2>Mafia</h2>
        <p className="lobby-sub">Ciyaarta saaxiibada ee sirta iyo dagaalka!</p>
      </div>
      <div className="lobby-players">
        {MEMBERS.map(name => (
          <div key={name} className="lobby-player-chip">👤 {name}</div>
        ))}
      </div>
      <div className="lobby-rules card">
        <h3>📋 Xeerarka</h3>
        <ul>
          <li>🔪 <strong>2 Mafia</strong> — habeenka qof xiraaan</li>
          <li>👥 <strong>6 Shacab</strong> — maalinta codeeya si Mafia loo dilo</li>
          <li>🏆 Shacabku waxay ku guulaysteen marka Mafiada la dhammiyo</li>
          <li>🔪 Mafia waxay ku guulaysteen marka ay la sinnaadaan shacabka</li>
        </ul>
      </div>
      <button className="btn btn-primary mafia-big-btn" onClick={onStart}>
        Bilow Ciyaarta 🎮
      </button>
    </div>
  )
}

// ── Phase: Role Reveal ────────────────────────────────────────

function PhaseRoleReveal({ game, myName, onReveal, onStartNight }) {
  const revealed    = game.players.filter(p => p.revealed).length
  const allRevealed = revealed === 8

  return (
    <div className="mafia-phase">
      <div className="phase-header">
        <h2>🃏 Doorarka La Qaybinayo</h2>
        <p>Telefoonkaaga ku tap magacaaga si aad u aragto doorarkaaga — KALIYA adiga!</p>
      </div>
      <div className="reveal-grid">
        {game.players.map(p => {
          const isMe   = myName === p.name
          const locked = myName && !isMe
          return (
            <button
              key={p.name}
              className={`reveal-card ${p.revealed ? 'rv-done' : ''} ${isMe ? 'rv-me' : ''} ${locked ? 'rv-locked' : ''}`}
              onClick={() => onReveal(p.name)}
              disabled={locked}
            >
              <span className="rv-avatar">{p.revealed ? '✅' : '🃏'}</span>
              <span className="rv-name">{p.name}</span>
              {p.revealed && <span className="rv-label">La arkay</span>}
            </button>
          )
        })}
      </div>
      <div className="reveal-progress-wrap">
        <div className="reveal-prog-bar">
          <div className="reveal-prog-fill" style={{ width: `${(revealed / 8) * 100}%` }} />
        </div>
        <p className="reveal-prog-text">{revealed}/8 qof ayaa doorarkooda arkay</p>
      </div>
      {allRevealed && (
        <button className="btn btn-primary mafia-big-btn bounce-in" onClick={onStartNight}>
          🌙 Bilow Habeenka!
        </button>
      )}
    </div>
  )
}

// ── Phase: Night ──────────────────────────────────────────────

function PhaseNight({ game, myName, me, onKill }) {
  const [selected, setSelected] = useState(null)
  const [sent, setSent]         = useState(false)

  const isMafia = me?.role === 'mafia' && me?.alive
  const targets = game.players.filter(p => p.alive && p.role !== 'mafia')

  async function handleKill() {
    if (!selected || sent) return
    setSent(true)
    await onKill(selected)
  }

  if (!myName) return (
    <div className="mafia-phase night-center">
      <span className="big-night-moon">🌙</span>
      <h2>Habeenkii waa bilaabmay...</h2>
      <p>Ma garanayso cidda aad tahay. Ciyaarta dib u bilow!</p>
    </div>
  )

  if (isMafia) return (
    <div className="mafia-phase night-mafia-screen">
      <div className="night-mafia-header">
        <span className="night-knife">🔪</span>
        <h2>Adiga waxaad tahay MAFIA</h2>
        <p>Dooro qofka aad xisha xalay...</p>
      </div>
      <div className="kill-targets">
        {targets.map(p => (
          <button
            key={p.name}
            className={`kill-target-btn ${selected === p.name ? 'kill-selected' : ''}`}
            onClick={() => !sent && setSelected(p.name)}
            disabled={sent}
          >
            👤 {p.name}
          </button>
        ))}
      </div>
      <button
        className="btn btn-guilty mafia-big-btn"
        onClick={handleKill}
        disabled={!selected || sent}
      >
        {sent ? '⏳ La gudbinayaa...' : '🔪 Xaq u geli!'}
      </button>
    </div>
  )

  return (
    <div className="mafia-phase night-center">
      <span className="big-night-moon">🌙</span>
      <h2>Habeenkii waa bilaabmay...</h2>
      <p className="night-sub">
        {me?.alive ? '😴 Hurdo! Mafia waxay shaqeynaysaa xalay...' : '💀 Waa la dilay — daawasho kaliya!'}
      </p>
      <div className="night-suspense-dots"><span /><span /><span /></div>
    </div>
  )
}

// ── Phase: Day ────────────────────────────────────────────────

function PhaseDay({ game, myName, me, voteCount, canClose, onVote, onClose }) {
  const alivePlayers = game.players.filter(p => p.alive)
  const myVote       = game.day_votes?.[myName]
  const canVote      = me?.alive && !myVote
  const tally        = {}
  Object.values(game.day_votes || {}).forEach(t => { tally[t] = (tally[t] || 0) + 1 })
  const maxVotes     = Math.max(0, ...Object.values(tally))

  return (
    <div className="mafia-phase">
      <div className="phase-header">
        <h2>☀️ Codeynta Maalinta</h2>
        <p>Doorso cidda Mafia ah — codee hadda!</p>
      </div>
      <div className="vote-grid">
        {alivePlayers.map(p => {
          const count      = tally[p.name] || 0
          const iVotedThis = myVote === p.name
          const isMe       = p.name === myName
          const pct        = maxVotes > 0 ? (count / maxVotes) * 100 : 0
          return (
            <button
              key={p.name}
              className={`vote-card ${iVotedThis ? 'vc-my-vote' : ''} ${isMe || !canVote ? 'vc-disabled' : ''}`}
              onClick={() => canVote && !isMe && onVote(p.name)}
              disabled={!canVote || isMe}
            >
              <span className="vc-name">{p.name}</span>
              {isMe && <span className="vc-tag">Adiga</span>}
              {iVotedThis && <span className="vc-tag vc-tag-voted">✓ Codkaaga</span>}
              {count > 0 && (
                <>
                  <div className="vc-bar-wrap">
                    <div className="vc-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="vc-count">🗳️ {count}</span>
                </>
              )}
            </button>
          )
        })}
      </div>
      <p className="vote-progress">🗳️ {voteCount}/{alivePlayers.length} qof ayaa codeeyay</p>
      {canClose && (
        <button className="btn btn-guilty mafia-big-btn bounce-in" onClick={onClose}>
          ⚖️ Xidh Codeynta — Ciqaab!
        </button>
      )}
      {!me?.alive && <p className="spectator-note">💀 Waa la dilay — daawasho kaliya</p>}
    </div>
  )
}

// ── Phase: Game Over ──────────────────────────────────────────

function PhaseGameOver({ game, onReset }) {
  const mafiaWon = game.winner === 'mafia'
  return (
    <div className={`mafia-phase gameover-phase ${mafiaWon ? 'go-mafia' : 'go-civilians'}`}>
      <div className="go-hero bounce-in">
        <span className="go-icon">{mafiaWon ? '🔪' : '🕊️'}</span>
        <h2 className="go-title">
          {mafiaWon ? 'MAFIA WAY GUULEYSTEEN!' : 'SHACABKU WAY GUULEYSTEEN!'}
        </h2>
        <p className="go-sub">
          {mafiaWon
            ? '🔪 Mafia waxay qabsatay magaalada! Cidna kama badbaadin!'
            : '🕊️ Shacabku waxay rid tirteen Mafia! Nabad iyo amaan!'}
        </p>
      </div>
      <div className="go-roles card">
        <h3>📋 Doorarka Dhammaan</h3>
        <div className="go-roles-grid">
          {game.players.map(p => (
            <div
              key={p.name}
              className={`go-role-chip ${p.role === 'mafia' ? 'gr-mafia' : 'gr-civilian'} ${!p.alive ? 'gr-dead' : ''}`}
            >
              <span>{p.role === 'mafia' ? '🔪' : '👥'}</span>
              <span className="gr-name">{p.name}</span>
              <span className="gr-label">{p.role === 'mafia' ? 'Mafia' : 'Shacab'}</span>
              {!p.alive && <span className="gr-dead-mark">💀</span>}
            </div>
          ))}
        </div>
      </div>
      {!!game.log?.length && (
        <div className="go-log card">
          <h3>📜 Dhacdooyinka</h3>
          {game.log.map((e, i) => (
            <div key={i} className="go-log-entry">
              <span className="go-log-round">R{e.round}</span>
              <span>{e.message}</span>
            </div>
          ))}
        </div>
      )}
      <button className="btn btn-primary mafia-big-btn" onClick={onReset}>🔄 Ciyaar Cusub</button>
    </div>
  )
}

// ── Game Log ──────────────────────────────────────────────────

function GameLog({ log }) {
  return (
    <div className="game-log card">
      <h3>📜 Dhacdooyinka</h3>
      <div className="gl-entries">
        {[...log].reverse().map((e, i) => (
          <div key={i} className="gl-entry">
            <span className="gl-round">R{e.round}</span>
            <span className="gl-msg">{e.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
