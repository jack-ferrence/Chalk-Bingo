import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

function formatTipoff(dateStr) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

function GameBrowserPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creatingGameId, setCreatingGameId] = useState(null)
  const [customName, setCustomName] = useState('')
  const [createError, setCreateError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/.netlify/functions/get-games')
        if (!res.ok) throw new Error(`Failed to load games (${res.status})`)
        const data = await res.json()
        setGames(data.games ?? [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchGames()
  }, [])

  const handleCreateRoom = async (game) => {
    if (!user) return
    setCreateError('')
    setCreateLoading(true)

    const roomName = (customName.trim() || `${game.away.abbr} @ ${game.home.abbr}`).slice(0, 50)
    if (roomName.length < 3) {
      setCreateError('Room name must be 3–50 characters.')
      setCreateLoading(false)
      return
    }

    const { data, error: roomError } = await supabase
      .from('rooms')
      .insert({
        name: roomName,
        game_id: game.id,
        status: 'lobby',
        created_by: user.id,
      })
      .select()
      .single()

    if (roomError) {
      setCreateError(roomError.message)
      setCreateLoading(false)
      return
    }

    await supabase
      .from('room_participants')
      .insert({ room_id: data.id, user_id: user.id })

    setCreateLoading(false)
    setCreatingGameId(null)
    setCustomName('')
    navigate(`/room/${data.id}`)
  }

  return (
    <div className="space-y-6 px-4 py-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            style={{
              fontFamily: 'var(--ch-font-display)',
              fontSize: 40,
              color: '#F1F5F9',
              lineHeight: 1,
              letterSpacing: '0.02em',
            }}
          >
            Tonight&apos;s NBA Games
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#94A3B8' }}>
            Pick a game to create a bingo room.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition hover:opacity-80"
          style={{
            background: '#1A2235',
            color: '#94A3B8',
            border: '1px solid #1E293B',
          }}
        >
          ← Back to Lobby
        </button>
      </div>

      {error && (
        <div
          className="rounded-md px-3 py-2 text-sm"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#EF4444',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm" style={{ color: '#64748B' }}>
          Loading games from ESPN…
        </div>
      ) : games.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm" style={{ color: '#94A3B8' }}>No NBA games scheduled today.</p>
          <p className="text-xs" style={{ color: '#64748B' }}>Check back on a game day.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <div
              key={game.id}
              className="relative flex flex-col justify-between rounded-xl p-5"
              style={{ background: '#111827', border: '1px solid #1E293B' }}
            >
              {game.isLive && (
                <span
                  className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                  Live
                </span>
              )}

              {game.isFinished && (
                <span
                  className="absolute right-3 top-3 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ background: '#1A2235', color: '#64748B', border: '1px solid #334155' }}
                >
                  Final
                </span>
              )}

              <div className="space-y-3">
                <TeamRow team={game.away} showScore={game.isLive || game.isFinished} />
                <div style={{ height: 1, background: '#1E293B' }} />
                <TeamRow team={game.home} showScore={game.isLive || game.isFinished} />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs" style={{ color: '#64748B' }}>
                  {game.isLive
                    ? game.statusDetail
                    : game.isFinished
                      ? 'Final'
                      : formatTipoff(game.date)}
                </div>

                {!game.isFinished && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingGameId(game.id)
                      setCustomName(`${game.away.abbr} @ ${game.home.abbr}`)
                    }}
                    className="rounded-md px-3 py-1.5 text-xs font-bold transition hover:bg-[#69F0AE]"
                    style={{ background: '#00E676', color: '#0A0E17' }}
                  >
                    Create Room
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {creatingGameId && (
        <div className="fixed inset-0 z-30 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: '#111827', border: '1px solid #1E293B' }}
          >
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: '#F1F5F9' }}>
              Create Room
            </h2>
            <p className="mt-1 text-xs" style={{ color: '#64748B' }}>
              ESPN Game ID:{' '}
              <span className="font-mono" style={{ color: '#94A3B8' }}>{creatingGameId}</span>
            </p>

            {createError && (
              <div
                className="mt-3 rounded-md px-3 py-2 text-sm"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#EF4444',
                }}
              >
                {createError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const game = games.find((g) => g.id === creatingGameId)
                if (game) handleCreateRoom(game)
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label
                  htmlFor="room-name"
                  className="mb-1 block text-xs font-medium uppercase tracking-wide"
                  style={{ color: '#64748B' }}
                >
                  Room name
                </label>
                <input
                  id="room-name"
                  type="text"
                  required
                  minLength={3}
                  maxLength={50}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-sm outline-none transition"
                  style={{
                    background: '#0A0E17',
                    border: '1px solid #1E293B',
                    color: '#F1F5F9',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#00E676' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#1E293B' }}
                  placeholder="My Bingo Room"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!createLoading) {
                      setCreatingGameId(null)
                      setCustomName('')
                      setCreateError('')
                    }
                  }}
                  className="rounded-md px-3 py-1.5 text-xs font-medium transition"
                  style={{ color: '#94A3B8', background: 'transparent', border: '1px solid #1E293B' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1A2235' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="rounded-md px-4 py-1.5 text-xs font-bold transition hover:bg-[#69F0AE] disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ background: '#00E676', color: '#0A0E17' }}
                >
                  {createLoading ? 'Creating…' : 'Create & Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function TeamRow({ team, showScore }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {team.logo && (
          <img
            src={team.logo}
            alt={team.abbr}
            className="h-7 w-7 object-contain"
          />
        )}
        <div>
          <p className="text-sm font-medium" style={{ color: '#F1F5F9' }}>{team.name}</p>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: '#64748B' }}>
            {team.abbr}
          </p>
        </div>
      </div>
      {showScore && (
        <span className="text-lg font-bold tabular-nums" style={{ color: '#F1F5F9' }}>
          {team.score}
        </span>
      )}
    </div>
  )
}

export default GameBrowserPage
