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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Today&apos;s NBA Games
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Pick a game to create a bingo room.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
        >
          Back to Lobby
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center text-slate-400">
          Loading games from ESPN...
        </div>
      ) : games.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-slate-300">No NBA games scheduled today.</p>
          <p className="text-xs text-slate-500">Check back on a game day.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <div
              key={game.id}
              className="relative flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-5 shadow-sm shadow-black/40"
            >
              {game.isLive && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/40">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Live
                </span>
              )}

              {game.isFinished && (
                <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-slate-700/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 ring-1 ring-slate-600/60">
                  Final
                </span>
              )}

              <div className="space-y-3">
                <TeamRow team={game.away} showScore={game.isLive || game.isFinished} />
                <div className="border-t border-slate-800" />
                <TeamRow team={game.home} showScore={game.isLive || game.isFinished} />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-slate-500">
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
                    className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-sky-500/30 transition hover:bg-sky-400"
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
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-black/70">
            <h2 className="text-lg font-semibold tracking-tight text-slate-50">
              Create Room
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              ESPN Game ID:{' '}
              <span className="font-mono text-slate-300">{creatingGameId}</span>
            </p>

            {createError && (
              <div className="mt-3 rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
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
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400"
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
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="rounded-md bg-sky-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm shadow-sky-500/30 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {createLoading ? 'Creating...' : 'Create & Join'}
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
          <p className="text-sm font-medium text-slate-100">{team.name}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            {team.abbr}
          </p>
        </div>
      </div>
      {showScore && (
        <span className="text-lg font-bold tabular-nums text-slate-50">
          {team.score}
        </span>
      )}
    </div>
  )
}

export default GameBrowserPage
