import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

function statusLabel(status) {
  if (status === 'live') return 'Live'
  if (status === 'lobby') return 'Lobby'
  if (status === 'finished') return 'Finished'
  return status
}

function statusClasses(status) {
  if (status === 'live') {
    return 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40'
  }
  if (status === 'lobby') {
    return 'bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/40'
  }
  if (status === 'finished') {
    return 'bg-slate-700/40 text-slate-300 ring-1 ring-slate-600/60'
  }
  return 'bg-slate-700/40 text-slate-300 ring-1 ring-slate-600/60'
}

function LobbyPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [rooms, setRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [joiningRoomId, setJoiningRoomId] = useState(null)
  const [error, setError] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createGameId, setCreateGameId] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  const hasRooms = useMemo(() => rooms.length > 0, [rooms])

  const loadRooms = async () => {
    setLoadingRooms(true)
    setError('')

    const { data, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .in('status', ['lobby', 'live'])
      .order('created_at', { ascending: false })

    if (roomsError) {
      setError(roomsError.message)
      setLoadingRooms(false)
      return
    }

    const withCounts =
      data && data.length > 0
        ? await Promise.all(
            data.map(async (room) => {
              const { count, error: countError } = await supabase
                .from('room_participants')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', room.id)

              if (countError) {
                console.error('Error counting participants', countError)
              }

              return {
                ...room,
                participantCount: typeof count === 'number' ? count : 0,
              }
            }),
          )
        : []

    setRooms(withCounts)
    setLoadingRooms(false)
  }

  useEffect(() => {
    loadRooms()
  }, [])

  // Realtime: refresh room list (and participant counts) when anyone joins/leaves
  useEffect(() => {
    const channel = supabase
      .channel('lobby-room_participants')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
        },
        () => {
          loadRooms()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleJoinRoom = async (roomId) => {
    if (!user) return

    setError('')
    setJoiningRoomId(roomId)

    const { error: joinError } = await supabase
      .from('room_participants')
      .upsert(
        {
          room_id: roomId,
          user_id: user.id,
        },
        { onConflict: 'room_id,user_id' },
      )

    setJoiningRoomId(null)

    if (joinError) {
      setError(joinError.message)
      return
    }

    navigate(`/room/${roomId}`)
  }

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    if (!user) return

    setError('')
    setCreateLoading(true)

    const { data, error: roomError } = await supabase
      .from('rooms')
      .insert({
        name: createName.trim(),
        game_id: createGameId.trim(),
        status: 'lobby',
        created_by: user.id,
      })
      .select()
      .single()

    if (roomError) {
      setError(roomError.message)
      setCreateLoading(false)
      return
    }

    const roomId = data.id

    const { error: joinError } = await supabase
      .from('room_participants')
      .insert({
        room_id: roomId,
        user_id: user.id,
      })

    setCreateLoading(false)

    if (joinError) {
      setError(joinError.message)
      return
    }

    setRooms((prev) => [
      {
        ...data,
        participantCount: 1,
      },
      ...prev,
    ])

    setCreateName('')
    setCreateGameId('')
    setCreateOpen(false)

    navigate(`/room/${roomId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Lobby
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Join a live NBA room or create your own bingo game.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-500/30 transition hover:bg-sky-400"
        >
          Create Room
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400 sm:text-sm">
        Signed in as{' '}
        <span className="font-medium text-sky-400">
          {user?.email ?? 'unknown'}
        </span>
        .
      </div>

      <div className="rounded-2xl border border-slate-900 bg-gradient-to-b from-slate-950 to-slate-900/80 p-6 shadow-xl shadow-black/50">
        {loadingRooms ? (
          <div className="flex min-h-[150px] items-center justify-center text-slate-400">
            Loading rooms...
          </div>
        ) : hasRooms ? (
          <div className="grid gap-4 md:grid-cols-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 shadow-sm shadow-black/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-medium text-slate-100 sm:text-base">
                      {room.name}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Game ID:{' '}
                      <span className="font-mono text-slate-300">
                        {room.game_id}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(
                      room.status,
                    )}`}
                  >
                    {statusLabel(room.status)}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    <span className="text-slate-100">
                      {room.participantCount ?? 0}
                    </span>{' '}
                    player
                    {(room.participantCount ?? 0) === 1 ? '' : 's'} in room
                  </div>
                  <button
                    type="button"
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={joiningRoomId === room.id}
                    className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-950 shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {joiningRoomId === room.id ? 'Joining...' : 'Join Room'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[150px] flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-slate-300">
              No live or lobby rooms yet.
            </p>
            <p className="text-xs text-slate-500">
              Be the first to tip off a new game.
            </p>
          </div>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-black/70">
            <h2 className="text-lg font-semibold tracking-tight text-slate-50">
              Create a room
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Name your room and link it to an NBA game identifier.
            </p>

            <form onSubmit={handleCreateRoom} className="mt-4 space-y-4">
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
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Friday Night Doubleheader"
                />
              </div>

              <div>
                <label
                  htmlFor="game-id"
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400"
                >
                  Game ID
                </label>
                <input
                  id="game-id"
                  type="text"
                  required
                  value={createGameId}
                  onChange={(e) => setCreateGameId(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="nba-2026-02-26-lal-bos"
                />
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!createLoading) {
                      setCreateOpen(false)
                      setCreateName('')
                      setCreateGameId('')
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

export default LobbyPage

