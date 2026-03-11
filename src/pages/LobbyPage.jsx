import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import { useHomeData } from '../hooks/useHomeData.js'
import SportSection from '../components/home/SportSection.jsx'

const SPORT_SECTIONS = [
  { sport: 'nba',           label: '🏀 NBA' },
  { sport: 'mlb',           label: '⚾ MLB' },
  { sport: 'march_madness', label: '🏆 March Madness' },
]

export default function LobbyPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { allRooms, myRooms, loading, error } = useHomeData()

  const [joiningRoomId, setJoiningRoomId] = useState(null)
  const [joinError, setJoinError] = useState('')

  // Set of room IDs the user has already joined
  const joinedRoomIds = useMemo(
    () => new Set(myRooms.map((r) => r.id)),
    [myRooms]
  )

  // Group all public rooms by sport (default 'nba' if column absent)
  const roomsBySport = useMemo(() => {
    const groups = Object.fromEntries(SPORT_SECTIONS.map((s) => [s.sport, []]))
    for (const room of allRooms) {
      const sport = room.sport ?? 'nba'
      if (groups[sport]) groups[sport].push(room)
      else groups.nba.push(room)
    }
    return groups
  }, [allRooms])

  const handleJoin = async (roomId) => {
    if (!user) { navigate('/login'); return }
    setJoinError('')
    setJoiningRoomId(roomId)

    const { error: err } = await supabase
      .from('room_participants')
      .upsert(
        { room_id: roomId, user_id: user.id },
        { onConflict: 'room_id,user_id', ignoreDuplicates: true }
      )

    setJoiningRoomId(null)

    if (err) { setJoinError(err.message); return }
    navigate(`/room/${roomId}`)
  }

  const handleContinue = (roomId) => navigate(`/room/${roomId}`)

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1
          style={{
            fontFamily: 'var(--ch-font-display)',
            fontSize: 'clamp(32px, 4vw, 48px)',
            letterSpacing: '0.05em',
            lineHeight: 1,
            color: '#F1F5F9',
          }}
        >
          Tonight&apos;s Games
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#64748B' }}>
          Live bingo powered by real NBA stats. Pick a game and play.
        </p>
      </div>

      {/* Error */}
      {(error || joinError) && (
        <div
          className="mb-6 rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#EF4444',
          }}
        >
          {error || joinError}
        </div>
      )}

      {/* Sport sections */}
      <div className="space-y-10">
        {SPORT_SECTIONS.map((section, i) => (
          <SportSection
            key={section.sport}
            label={section.label}
            games={roomsBySport[section.sport] ?? []}
            loading={loading}
            joinedRoomIds={joinedRoomIds}
            joiningRoomId={joiningRoomId}
            onJoin={handleJoin}
            onContinue={handleContinue}
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
