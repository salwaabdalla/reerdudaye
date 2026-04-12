import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Header from './components/Header'
import Nav from './components/Nav'
import SubmitCase from './components/SubmitCase'
import ActiveCases from './components/ActiveCases'
import HallOfShame from './components/HallOfShame'
import CaseHistory from './components/CaseHistory'
import Fardibax from './components/Fardibax'
import SplashScreen from './components/SplashScreen'
import './App.css'

const SPLASH_KEY = 'reer-dudaaye-visited'
const VOTED_KEY  = 'reer-dudaaye-voted'

// Map a Supabase row to the shape the UI expects
function mapRow(row) {
  return {
    id:         row.id,
    accused:    row.accused,
    prosecutor: row.prosecutor,
    crime:      row.crime,
    verdict:    row.verdict,
    votes: {
      guilty:   row.guilty_votes,
      innocent: row.innocent_votes,
    },
    createdAt: row.created_at,
  }
}

function loadVoted() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(VOTED_KEY)) || [])
  } catch {
    return new Set()
  }
}

function saveVoted(set) {
  sessionStorage.setItem(VOTED_KEY, JSON.stringify([...set]))
}

export default function App() {
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem(SPLASH_KEY)
  )
  const [tab, setTab]           = useState('active')
  const [cases, setCases]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [votedCases, setVotedCases] = useState(loadVoted)

  // ── Initial fetch ──────────────────────────────────────────
  useEffect(() => {
    async function fetchCases() {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setError('Khalad ayaa dhacay. Dib u soo gal!')
      } else {
        setCases(data.map(mapRow))
      }
      setLoading(false)
    }
    fetchCases()
  }, [])

  // ── Realtime subscription ──────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('cases-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cases' },
        ({ new: row }) => {
          setCases(prev => [mapRow(row), ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cases' },
        ({ new: row }) => {
          setCases(prev =>
            prev.map(c => c.id === row.id ? mapRow(row) : c)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ── Add case ───────────────────────────────────────────────
  // Realtime INSERT will update state — we just insert and switch tab
  async function addCase({ accused, prosecutor, crime }) {
    const { error } = await supabase.from('cases').insert({
      accused,
      prosecutor,
      crime,
      verdict:        'sugaya',
      guilty_votes:   0,
      innocent_votes: 0,
    })
    if (error) throw error
    setTab('active')
  }

  // ── Vote ───────────────────────────────────────────────────
  // We already have current counts in state, so no extra fetch needed.
  // Realtime UPDATE will sync the new row to all clients.
  const vote = useCallback(async (caseId, voteType) => {
    const c = cases.find(x => x.id === caseId)
    if (!c) return

    // Optimistically mark voted so the button disables immediately
    setVotedCases(prev => {
      const next = new Set(prev)
      next.add(caseId)
      saveVoted(next)
      return next
    })

    const newGuilty   = c.votes.guilty   + (voteType === 'guilty'   ? 1 : 0)
    const newInnocent = c.votes.innocent + (voteType === 'innocent' ? 1 : 0)
    const total       = newGuilty + newInnocent
    const verdict     = total >= 3
      ? (newGuilty > newInnocent ? 'dembi-leh' : 'dembi-maleh')
      : 'sugaya'

    const { error } = await supabase
      .from('cases')
      .update({
        guilty_votes:   newGuilty,
        innocent_votes: newInnocent,
        verdict,
      })
      .eq('id', caseId)

    if (error) {
      // Roll back optimistic voted mark on failure
      setVotedCases(prev => {
        const next = new Set(prev)
        next.delete(caseId)
        saveVoted(next)
        return next
      })
    }
  }, [cases])

  function handleEnter() {
    sessionStorage.setItem(SPLASH_KEY, '1')
    setShowSplash(false)
  }

  const activeCases = cases.filter(c => c.verdict === 'sugaya')
  const closedCases = cases.filter(c => c.verdict !== 'sugaya')

  return (
    <div className="app">
      {showSplash && <SplashScreen onEnter={handleEnter} />}
      <Header />
      <Nav tab={tab} setTab={setTab} activeCnt={activeCases.length} />
      <main className="main-content">
        {loading && (
          <div className="loading-state">
            <span className="loading-emoji">⚖️</span>
            <p>Maxkamadda waxay furaysaa...</p>
          </div>
        )}
        {error && !loading && (
          <div className="error-state">
            <span>😱 {error}</span>
          </div>
        )}
        {!loading && !error && (
          <>
            {tab === 'submit'       && <SubmitCase onSubmit={addCase} totalCases={cases.length} />}
            {tab === 'active'       && <ActiveCases cases={activeCases} onVote={vote} votedCases={votedCases} />}
            {tab === 'fardibax' && <Fardibax />}
            {tab === 'shame'        && <HallOfShame cases={cases} />}
            {tab === 'history'      && <CaseHistory cases={cases} />}
          </>
        )}
      </main>
      <footer className="footer">
        <p>⚖️ Maxkamadda Reer Dudaaye — Cadaaladda Waa Noo Muhiim 💅✨</p>
      </footer>
    </div>
  )
}
