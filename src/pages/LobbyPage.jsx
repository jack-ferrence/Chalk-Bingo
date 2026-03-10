import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

function statusLabel(status) {
  if (status === 'live') return 'Live'
  if (status === 'lobby') return 'Lobby'
  if (status === 'finished') return 'Finished'
  return status
}

function StatusBadge({ status }) {
  if (status === 'live') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
        style={{
          background: 'rgba(255,59,59,0.12)',
          color: 'var(--ch-live)',
          border: '1px solid rgba(255,59,59,0.3)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: 'var(--ch-live)', animation: 'ch-pulse 1.5s ease-in-out infinite' }}
        />
        Live
      </span>
    )
  }
  if (status === 'lobby') {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5"
        style={{
          background: 'rgba(245,166,35,0.1)',
          color: 'var(--ch-primary)',
          border: '1px solid rgba(245,166,35,0.25)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        Lobby
      </span>
    )
  }
  if (status === 'finished') {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5"
        style={{
          background: 'var(--ch-gray-800)',
          color: 'var(--ch-gray-400)',
          border: '1px solid var(--ch-gray-700)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        Finished
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5" style={{ fontSize: 10, fontWeight: 700, color: 'var(--ch-gray-400)' }}>
      {statusLabel(status)}
    </span>
  )
}

function LobbyPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [rooms, setRooms] = useState([])
  const [myRooms, setMyRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [joiningRoomId, setJoiningRoomId] = useState(null)
  const [error, setError] = useState('')

  const hasRooms = useMemo(() => rooms.length > 0, [rooms])

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true)
    setError('')

    const [{ data, error: roomsError }, myParticipantsResult] = await Promise.all([
      supabase
        .from('rooms_with_counts')
        .select('*')
        .in('status', ['lobby', 'live'])
        .order('created_at', { ascending: false }),
      user
        ? supabase
            .from('room_participants')
            .select('room_id')
            .eq('user_id', user.id)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (roomsError) {
      setError(roomsError.message)
      setRooms([])
      setMyRooms([])
      setLoadingRooms(false)
      return
    }

    const allRooms = data ?? []
    setRooms(allRooms)

    if (user && !myParticipantsResult.error) {
      const joinedIds = new Set((myParticipantsResult.data ?? []).map((p) => p.room_id))
      setMyRooms(allRooms.filter((r) => joinedIds.has(r.id)))
    } else {
      setMyRooms([])
    }

    setLoadingRooms(false)
  }, [user])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  const debounceRef = useRef(null)
  const debouncedLoadRooms = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadRooms(), 500)
  }, [loadRooms])

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
          debouncedLoadRooms()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [debouncedLoadRooms])

  const handleContinue = (roomId) => navigate(`/room/${roomId}`)

  const handleJoinRoom = async (roomId) => {
    if (!user) return

    setError('')
    setJoiningRoomId(roomId)

    const { error: joinError } = await supabase
      .from('room_participants')
      .upsert(
        { room_id: roomId, user_id: user.id },
        { onConflict: 'room_id,user_id', ignoreDuplicates: true },
      )

    setJoiningRoomId(null)

    if (joinError) {
      console.error('Join room error:', joinError)
      setError(joinError.message)
      return
    }

    navigate(`/room/${roomId}`)
  }

  const cardStyle = {
    background: '#1A1410',
    border: '1px solid rgba(245,166,35,0.1)',
    borderRadius: 'var(--ch-radius-lg)',
    transition: 'all 0.2s ease',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 style={{ fontFamily: 'var(--ch-font-display)', fontSize: 56, color: 'var(--ch-white)', lineHeight: 1 }}>
            Lobby
          </h1>
          <p className="mt-2" style={{ color: 'var(--ch-gray-400)', fontSize: 15 }}>
            Join a live NBA room or create your own bingo game.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/games')}
          className="cursor-pointer hover:underline"
          style={{ color: 'var(--ch-primary)', fontWeight: 600, fontSize: 14, background: 'none', border: 'none' }}
        >
          Browse Games &amp; Create Room →
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 text-sm" style={{ background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.3)', borderRadius: 'var(--ch-radius-md)', color: 'var(--ch-live)' }}>
          {error}
        </div>
      )}

      <div
        className="p-4 text-sm"
        style={{
          background: '#1A1410',
          borderLeft: '3px solid var(--ch-primary)',
          borderRadius: 'var(--ch-radius-md)',
          color: 'var(--ch-gray-400)',
        }}
      >
        Signed in as{' '}
        <span style={{ color: 'var(--ch-primary)', fontWeight: 600 }}>
          {user?.is_anonymous ? `Guest_${user.id.slice(0, 8)}` : (user?.email ?? 'Guest')}
        </span>
      </div>

      <div className="space-y-6">
        {loadingRooms ? (
          <div className="flex min-h-[200px] items-center justify-center" style={{ color: 'var(--ch-gray-500)' }}>
            Loading rooms...
          </div>
        ) : (
          <>
            {myRooms.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 style={{ fontFamily: 'var(--ch-font-body)', fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ch-primary)' }}>
                    My Rooms
                  </h2>
                  <span style={{ fontSize: 11, color: 'var(--ch-gray-500)' }}>
                    Continue games you&apos;ve already joined.
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {myRooms.map((room) => (
                    <div
                      key={room.id}
                      className="group flex flex-col justify-between p-4"
                      style={cardStyle}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(245,166,35,0.3)'; e.currentTarget.style.boxShadow = 'var(--ch-shadow-amber)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(245,166,35,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 style={{ color: 'var(--ch-white)', fontWeight: 700, fontSize: 17 }}>
                            {room.name}
                          </h3>
                          <p className="mt-1" style={{ color: 'var(--ch-gray-500)', fontSize: 13 }}>
                            ESPN Game:{' '}
                            <span className="font-mono" style={{ color: 'var(--ch-gray-400)' }}>
                              {room.game_id}
                            </span>
                          </p>
                        </div>
                        <StatusBadge status={room.status} />
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div style={{ color: 'var(--ch-gray-400)', fontSize: 13 }}>
                          <span style={{ color: 'var(--ch-white)' }}>
                            {room.participant_count ?? 0}
                          </span>{' '}
                          player
                          {(room.participant_count ?? 0) === 1 ? '' : 's'} in room
                        </div>
                        <button
                          type="button"
                          onClick={() => handleContinue(room.id)}
                          className="inline-flex items-center justify-center px-4 py-1.5 cursor-pointer"
                          style={{
                            background: 'var(--ch-gradient-primary)',
                            color: 'var(--ch-secondary)',
                            borderRadius: 'var(--ch-radius-md)',
                            fontWeight: 700,
                            fontSize: 13,
                            border: 'none',
                            boxShadow: 'var(--ch-shadow-amber)',
                          }}
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasRooms ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 style={{ fontFamily: 'var(--ch-font-body)', fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ch-primary)' }}>
                    All Rooms
                  </h2>
                  <span style={{ fontSize: 11, color: 'var(--ch-gray-500)' }}>
                    Join a live room or create a new one.
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className="group flex flex-col justify-between p-4"
                      style={cardStyle}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(245,166,35,0.3)'; e.currentTarget.style.boxShadow = 'var(--ch-shadow-amber)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(245,166,35,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 style={{ color: 'var(--ch-white)', fontWeight: 700, fontSize: 17 }}>
                            {room.name}
                          </h3>
                          <p className="mt-1" style={{ color: 'var(--ch-gray-500)', fontSize: 13 }}>
                            ESPN Game:{' '}
                            <span className="font-mono" style={{ color: 'var(--ch-gray-400)' }}>
                              {room.game_id}
                            </span>
                          </p>
                        </div>
                        <StatusBadge status={room.status} />
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div style={{ color: 'var(--ch-gray-400)', fontSize: 13 }}>
                          <span style={{ color: 'var(--ch-white)' }}>
                            {room.participant_count ?? 0}
                          </span>{' '}
                          player
                          {(room.participant_count ?? 0) === 1 ? '' : 's'} in room
                        </div>
                        <button
                          type="button"
                          onClick={() => handleJoinRoom(room.id)}
                          disabled={joiningRoomId === room.id}
                          className="inline-flex items-center justify-center px-4 py-1.5 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                          style={{
                            background: 'transparent',
                            color: 'var(--ch-primary)',
                            border: '2px solid var(--ch-primary)',
                            borderRadius: 'var(--ch-radius-md)',
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                          onMouseEnter={(e) => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = 'var(--ch-primary)'; e.currentTarget.style.color = 'var(--ch-secondary)' } }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ch-primary)' }}
                        >
                          {joiningRoomId === room.id ? 'Joining...' : 'Join Room'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
                <p style={{ color: 'var(--ch-gray-300)', fontSize: 14 }}>
                  No live or lobby rooms yet.
                </p>
                <p style={{ color: 'var(--ch-gray-500)', fontSize: 13 }}>
                  Be the first —{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/games')}
                    className="underline underline-offset-2 cursor-pointer hover:opacity-80"
                    style={{ color: 'var(--ch-primary)', background: 'none', border: 'none' }}
                  >
                    browse today&apos;s games
                  </button>{' '}
                  to tip off a new room.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default LobbyPage
