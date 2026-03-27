import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useHomeData } from '../hooks/useHomeData.js'
import { useCountdown } from '../hooks/useCountdown.js'
import SportSection from '../components/home/SportSection.jsx'
import TopPlayers from '../components/home/TopPlayers.jsx'

function GameCountdown({ date }) {
  const { total, minutes, seconds, isExpired } = useCountdown(date)

  if (!date || isExpired) {
    return (
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 10, fontWeight: 700, color: '#ff6b35' }}>STARTING SOON</span>
        <p style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, color: '#ff6b35', marginTop: 2 }}>TAP TO PLAY →</p>
      </div>
    )
  }

  if (total < 60 * 60 * 1000) {
    return (
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 14, fontWeight: 800, color: '#e0e0f0', letterSpacing: '0.04em' }}>
          {minutes}:{String(seconds).padStart(2, '0')}
        </span>
        <p style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, color: '#3a3a55', marginTop: 2 }}>TAP TO PLAY →</p>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'right' }}>
      <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 12, fontWeight: 700, color: '#8888aa' }}>
        {new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </span>
      <p style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, color: '#3a3a55', marginTop: 2 }}>TAP TO PLAY →</p>
    </div>
  )
}

const SPORT_SECTIONS = [
  { sport: 'nba',  label: '🏀 NBA' },
  { sport: 'ncaa', label: '🏆 NCAA' },
  { sport: 'mlb',  label: '⚾ MLB' },
]

export default function LobbyPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { allRooms, loading, error } = useHomeData()

  const [activeSport, setActiveSport] = useState('all')

  const handleOpenGame = (roomId) => {
    if (!user) { navigate('/login'); return }
    navigate(`/room/${roomId}`)
  }

  // Mobile: flat priority-sorted list (live first, then finished, then lobby)
  const mobileSortedGames = useMemo(() => {
    return [...allRooms].sort((a, b) => {
      const aLive = a.status === 'live' ? 1 : 0
      const bLive = b.status === 'live' ? 1 : 0
      const aFinished = a.status === 'finished' ? 1 : 0
      const bFinished = b.status === 'finished' ? 1 : 0
      const aPriority = aLive * 4 + aFinished * 2
      const bPriority = bLive * 4 + bFinished * 2
      if (bPriority !== aPriority) return bPriority - aPriority
      const aTime = a.starts_at ? new Date(a.starts_at).getTime() : Infinity
      const bTime = b.starts_at ? new Date(b.starts_at).getTime() : Infinity
      return aTime - bTime
    })
  }, [allRooms])

  // Desktop: group by sport, sorted live → lobby → finished
  const roomsBySport = useMemo(() => {
    const statusRank = (r) => r.status === 'live' ? 0 : r.status === 'lobby' ? 1 : 2
    const groups = Object.fromEntries(SPORT_SECTIONS.map((s) => [s.sport, []]))
    for (const room of allRooms) {
      const sport = room.sport ?? 'nba'
      if (groups[sport]) groups[sport].push(room)
      else groups.nba.push(room)
    }
    for (const sport of Object.keys(groups)) {
      groups[sport].sort((a, b) => {
        const rankDiff = statusRank(a) - statusRank(b)
        if (rankDiff !== 0) return rankDiff
        if (a.status === 'finished') return (b.starts_at ?? '') > (a.starts_at ?? '') ? 1 : -1
        return (a.starts_at ?? '') > (b.starts_at ?? '') ? 1 : -1
      })
    }
    return groups
  }, [allRooms])

  const filteredMobileGames = useMemo(() => {
    if (activeSport === 'all') return mobileSortedGames
    return mobileSortedGames.filter((r) => (r.sport ?? 'nba') === activeSport)
  }, [mobileSortedGames, activeSport])

  const liveCount = allRooms.filter((r) => r.status === 'live').length

  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-[1200px] mx-auto">
      {/* Page header */}
      <div className="mb-3 md:mb-9">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1
              className="lobby-title"
              style={{
                fontFamily: 'var(--db-font-mono)',
                fontSize: 'clamp(18px, 3vw, 28px)',
                fontWeight: 800,
                letterSpacing: '0.10em',
                lineHeight: 1,
                color: '#e0e0f0',
                textTransform: 'uppercase',
              }}
            >
              Games
            </h1>
            <p className="hidden md:block mt-1" style={{ fontFamily: 'var(--db-font-mono)', fontSize: 10, color: '#3a3a55', letterSpacing: '0.06em' }}>
              Live bingo powered by real stats
            </p>
          </div>
          {!loading && liveCount > 0 && (
            <span
              className="inline-flex items-center gap-1.5"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#ff2d2d',
                background: 'rgba(255,45,45,0.10)',
                border: '1px solid rgba(255,45,45,0.22)',
                padding: '3px 9px',
                borderRadius: 6,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff2d2d', display: 'inline-block', animation: 'pulse-live 1.4s ease-in-out infinite' }} />
              {liveCount} LIVE
            </span>
          )}
        </div>
      </div>

      {/* Sport tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
        {[
          { key: 'all',  label: 'ALL',  icon: null },
          { key: 'nba',  label: 'NBA',  icon: '🏀' },
          { key: 'ncaa', label: 'NCAA', icon: '🏆' },
          { key: 'mlb',  label: 'MLB',  icon: '⚾' },
        ].map((tab) => {
          const isActive = activeSport === tab.key
          const count = tab.key === 'all'
            ? allRooms.filter((r) => r.status === 'live' || r.status === 'lobby').length
            : allRooms.filter((r) => (r.sport ?? 'nba') === tab.key && (r.status === 'live' || r.status === 'lobby')).length
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSport(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 20, border: 'none',
                background: isActive ? '#ff6b35' : '#1a1a2e',
                color: isActive ? '#0c0c14' : '#8888aa',
                fontFamily: 'var(--db-font-mono)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.06em', cursor: 'pointer', flexShrink: 0,
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              {tab.icon && <span style={{ fontSize: 13 }}>{tab.icon}</span>}
              {tab.label}
              {count > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 8,
                  background: isActive ? 'rgba(0,0,0,0.2)' : '#2a2a44',
                  color: isActive ? '#0c0c14' : '#555577',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-6 px-4 py-3"
          style={{ background: 'rgba(255,45,45,0.08)', border: '1px solid rgba(255,45,45,0.25)', borderRadius: 6, fontFamily: 'var(--db-font-mono)', fontSize: 12, color: '#ff2d2d' }}
        >
          {error}
        </div>
      )}

      {/* Top players */}
      <div style={{ marginBottom: 16 }}>
        <TopPlayers />
      </div>

      {/* ── Desktop: sport-grouped sections ── */}
      <div className="hidden md:block space-y-10">
        {SPORT_SECTIONS
          .filter((s) => activeSport === 'all' || s.sport === activeSport)
          .map((section, i) => (
            <div key={section.sport} id={`sport-section-${section.sport}`}>
              <SportSection
                sport={section.sport}
                label={section.label}
                games={roomsBySport[section.sport] ?? []}
                loading={loading}
                onOpenGame={handleOpenGame}
                style={{ animationDelay: `${i * 100}ms` }}
              />
            </div>
          ))}
      </div>

      {/* ── Mobile: flat priority-sorted list ── */}
      <div className="block md:hidden">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          {liveCount > 0 && (
            <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, fontWeight: 700, padding: '2px 6px', background: 'rgba(255,45,45,0.12)', color: '#ff2d2d', borderRadius: 3 }}>
              {liveCount} LIVE
            </span>
          )}
          <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, color: '#3a3a55' }}>
            {loading ? '…' : `${filteredMobileGames.length} game${filteredMobileGames.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 58, borderRadius: 6, background: '#12121e' }} />
            ))}
          </div>
        )}

        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredMobileGames.length === 0 ? (
              <p style={{ fontFamily: 'var(--db-font-mono)', fontSize: 11, color: '#555577', padding: '12px 0' }}>
                No games available. Check back later!
              </p>
            ) : filteredMobileGames.map((room) => {
              const nameParts = (room.name || '').split(' vs ')
              const away = nameParts[0]?.trim() || '?'
              const home = nameParts[1]?.trim() || '?'
              const isLive = room.status === 'live'
              const isFinished = room.status === 'finished'

              return (
                <div
                  key={room.id}
                  onClick={() => handleOpenGame(room.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', background: '#12121e', borderRadius: 6,
                    border: '1px solid #2a2a44',
                    borderLeft: isLive ? '3px solid #ff2d2d' : isFinished ? '3px solid #555577' : '3px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  {/* Left: teams */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ minWidth: 105 }}>
                      <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 18, fontWeight: 800, color: '#8888aa', letterSpacing: '0.04em' }}>{away}</span>
                      <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 11, color: '#3a3a55', margin: '0 5px' }}>vs</span>
                      <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 18, fontWeight: 800, color: '#e0e0f0', letterSpacing: '0.04em' }}>{home}</span>
                    </div>
                  </div>

                  {/* Right: status */}
                  <div style={{ textAlign: 'right' }}>
                    {isLive ? (
                      <div>
                        <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 10, fontWeight: 700, color: '#ff2d2d' }}>● LIVE</span>
                        <p style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, color: '#ff6b35', marginTop: 2 }}>TAP TO PLAY →</p>
                      </div>
                    ) : isFinished ? (
                      <div>
                        <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 10, fontWeight: 700, color: '#555577' }}>FINAL</span>
                        {room.away_score != null && room.home_score != null && (
                          <p style={{ fontFamily: 'var(--db-font-mono)', fontSize: 12, fontWeight: 800, color: '#8888aa', marginTop: 2 }}>{room.away_score} - {room.home_score}</p>
                        )}
                        <p style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, color: '#3a3a55', marginTop: 2 }}>VIEW RESULTS →</p>
                      </div>
                    ) : (
                      <GameCountdown date={room.starts_at} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
