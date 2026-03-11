import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTipoff(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

function StatusBadge({ status }) {
  if (status === 'live') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
        Live
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: 'rgba(0,230,118,0.1)', color: '#00E676' }}
    >
      Lobby
    </span>
  )
}

// ── Public game card ──────────────────────────────────────────────────────────

function PublicRoomCard({ room, alreadyJoined, joining, onPlay, onContinue }) {
  const isLive = room.status === 'live'
  const borderLeft = isLive ? '3px solid #EF4444' : '3px solid #00E676'
  const hoverShadow = isLive
    ? '0 4px 20px rgba(239,68,68,0.15)'
    : '0 4px 20px rgba(0,230,118,0.1)'

  return (
    <div
      className="flex flex-col justify-between rounded-xl p-5 transition-all duration-200"
      style={{ background: '#111827', border: '1px solid #1E293B', borderLeft }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#334155'
        e.currentTarget.style.boxShadow = hoverShadow
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#1E293B'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="truncate font-bold"
            style={{ fontFamily: 'var(--ch-font-display)', fontSize: 18, color: '#F1F5F9', letterSpacing: '0.04em' }}
          >
            {room.name}
          </h3>
          {room.starts_at && !isLive && (
            <p className="mt-0.5 text-xs" style={{ color: '#64748B' }}>
              Tip-off {formatTipoff(room.starts_at)}
            </p>
          )}
          {isLive && (
            <p className="mt-0.5 text-xs" style={{ color: '#EF4444' }}>
              In progress
            </p>
          )}
        </div>
        <StatusBadge status={room.status} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm" style={{ color: '#94A3B8' }}>
          <span style={{ color: '#F1F5F9', fontWeight: 600 }}>
            {room.participant_count ?? 0}
          </span>{' '}
          {(room.participant_count ?? 0) === 1 ? 'player' : 'players'}
        </span>

        {alreadyJoined ? (
          <button
            type="button"
            onClick={() => onContinue(room.id)}
            className="inline-flex items-center justify-center rounded-lg text-sm font-bold transition-colors hover:bg-[#00E676]/10 min-w-[90px]"
            style={{ border: '1px solid #00E676', color: '#00E676', padding: '7px 16px' }}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onPlay(room.id)}
            disabled={joining}
            className="inline-flex items-center justify-center rounded-lg text-sm font-bold transition-colors hover:bg-[#69F0AE] disabled:cursor-not-allowed disabled:opacity-60 min-w-[90px]"
            style={{ background: '#00E676', color: '#0A0E17', padding: '7px 16px' }}
          >
            {joining ? 'Joining…' : 'Play'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Private room card (compact) ───────────────────────────────────────────────

function PrivateRoomCard({ room, joining, onJoin, onContinue, isMyRoom }) {
  const isLive = room.status === 'live'

  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200"
      style={{ background: '#111827', border: '1px solid #1E293B' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#334155' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E293B' }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold" style={{ color: '#F1F5F9' }}>
            {room.name}
          </p>
          <span
            className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: '#1A2235', color: '#475569' }}
          >
            Private
          </span>
          {isLive && (
            <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
          )}
        </div>
        <p className="mt-0.5 text-xs" style={{ color: '#64748B' }}>
          {room.participant_count ?? 0} {(room.participant_count ?? 0) === 1 ? 'player' : 'players'}
        </p>
      </div>

      {room.status !== 'finished' && (
        isMyRoom ? (
          <button
            type="button"
            onClick={() => onContinue(room.id)}
            className="ml-3 flex-shrink-0 rounded-lg text-xs font-bold transition-colors hover:bg-[#00E676]/10"
            style={{ border: '1px solid #00E676', color: '#00E676', padding: '5px 12px' }}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onJoin(room.id)}
            disabled={joining}
            className="ml-3 flex-shrink-0 rounded-lg text-xs font-bold transition-colors hover:bg-[#69F0AE] disabled:opacity-60"
            style={{ background: '#00E676', color: '#0A0E17', padding: '5px 12px' }}
          >
            {joining ? 'Joining…' : 'Join'}
          </button>
        )
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function LobbyPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [publicRooms, setPublicRooms] = useState([])
  const [myPrivateRooms, setMyPrivateRooms] = useState([])
  const [myPublicRoomIds, setMyPublicRoomIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [joiningRoomId, setJoiningRoomId] = useState(null)
  const [error, setError] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')

    // Fetch public rooms + user's room_participants in parallel
    const [publicResult, participantsResult] = await Promise.all([
      supabase
        .from('rooms_with_counts')
        .select('*')
        .eq('room_type', 'public')
        .neq('status', 'finished')
        .order('starts_at', { ascending: true, nullsFirst: false }),
      user
        ? supabase.from('room_participants').select('room_id').eq('user_id', user.id)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (publicResult.error) {
      setError(publicResult.error.message)
      setLoading(false)
      return
    }

    setPublicRooms(publicResult.data ?? [])

    if (user && !participantsResult.error) {
      const joinedIds = new Set((participantsResult.data ?? []).map((p) => p.room_id))

      // Which of the user's joined rooms are public?
      const publicIds = new Set(
        (publicResult.data ?? []).filter((r) => joinedIds.has(r.id)).map((r) => r.id)
      )
      setMyPublicRoomIds(publicIds)

      // Load private rooms where user is a participant
      if (joinedIds.size > 0) {
        const { data: privateRooms } = await supabase
          .from('rooms_with_counts')
          .select('*')
          .eq('room_type', 'private')
          .in('status', ['lobby', 'live'])
          .in('id', [...joinedIds])
          .order('created_at', { ascending: false })
        setMyPrivateRooms(privateRooms ?? [])
      } else {
        setMyPrivateRooms([])
      }
    } else {
      setMyPublicRoomIds(new Set())
      setMyPrivateRooms([])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Debounce helper for realtime triggers
  const debounceRef = useRef(null)
  const debouncedLoad = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadAll(), 600)
  }, [loadAll])

  // Realtime: rooms table (new public rooms from sync-games, status changes)
  // Realtime: room_participants (player counts)
  useEffect(() => {
    const roomsChannel = supabase
      .channel('lobby-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, debouncedLoad)
      .subscribe()

    const participantsChannel = supabase
      .channel('lobby-participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants' }, debouncedLoad)
      .subscribe()

    return () => {
      supabase.removeChannel(roomsChannel)
      supabase.removeChannel(participantsChannel)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [debouncedLoad])

  const handleContinue = (roomId) => navigate(`/room/${roomId}`)

  const handlePlay = async (roomId) => {
    if (!user) { navigate('/login'); return }
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
      setError(joinError.message)
      return
    }

    navigate(`/room/${roomId}`)
  }

  // handlePlay doubles as handleJoin for private rooms
  const handleJoin = handlePlay

  return (
    <div className="px-4 py-6 space-y-10 max-w-4xl mx-auto">

      {/* Error */}
      {error && (
        <div
          className="px-3 py-2 text-sm rounded-lg"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#EF4444',
          }}
        >
          {error}
        </div>
      )}

      {/* ── Tonight's Games ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2
            style={{
              fontFamily: 'var(--ch-font-display)',
              fontSize: 28,
              color: '#F1F5F9',
              letterSpacing: '0.05em',
              lineHeight: 1,
            }}
          >
            Tonight&apos;s Games
          </h2>
          <button
            type="button"
            onClick={() => navigate('/games')}
            className="text-xs font-semibold transition-colors hover:text-[#69F0AE]"
            style={{ color: '#00E676', background: 'none', border: 'none' }}
          >
            + Create Private Room
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[140px] items-center justify-center text-sm" style={{ color: '#64748B' }}>
            Loading…
          </div>
        ) : publicRooms.length === 0 ? (
          <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl text-center" style={{ background: '#111827', border: '1px solid #1E293B' }}>
            <p className="text-sm" style={{ color: '#94A3B8' }}>No games on the schedule yet.</p>
            <p className="text-xs" style={{ color: '#64748B' }}>Check back later — rooms appear automatically when games are added.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publicRooms.map((room) => (
              <PublicRoomCard
                key={room.id}
                room={room}
                alreadyJoined={myPublicRoomIds.has(room.id)}
                joining={joiningRoomId === room.id}
                onPlay={handlePlay}
                onContinue={handleContinue}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── My Private Rooms ── */}
      {!loading && user && myPrivateRooms.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#64748B' }}>
            My Private Rooms
          </h2>
          <div className="space-y-2">
            {myPrivateRooms.map((room) => (
              <PrivateRoomCard
                key={room.id}
                room={room}
                isMyRoom={true}
                joining={joiningRoomId === room.id}
                onJoin={handleJoin}
                onContinue={handleContinue}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default LobbyPage
