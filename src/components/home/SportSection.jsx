import { useRef } from 'react'
import GameCard from './GameCard.jsx'

const SKELETON_COUNT = 3

export default function SportSection({
  label,
  games,
  loading,
  joinedRoomIds,
  joiningRoomId,
  onJoin,
  onContinue,
  style,
}) {
  const sliderRef = useRef(null)

  const handleSeeAll = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: sliderRef.current.scrollWidth, behavior: 'smooth' })
    }
  }

  return (
    <section className="sport-section" style={style}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2
          style={{
            fontFamily: 'var(--ch-font-display)',
            fontSize: 28,
            lineHeight: 1,
            letterSpacing: '0.04em',
            color: '#F1F5F9',
          }}
        >
          {label}
        </h2>
        {games.length > 0 && (
          <button
            type="button"
            className="text-xs font-semibold transition-colors"
            style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#94A3B8' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B' }}
            onClick={handleSeeAll}
          >
            See All →
          </button>
        )}
      </div>

      {/* Horizontal slider */}
      {loading ? (
        <div
          className="flex gap-4 overflow-x-scroll no-scrollbar pb-3"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div
              key={i}
              className="skeleton-card"
              style={{ scrollSnapAlign: 'start' }}
            />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div
          className="rounded-lg px-6 py-8 text-center"
          style={{
            border: '1px dashed rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <p className="text-sm" style={{ color: '#475569' }}>No games today</p>
        </div>
      ) : (
        <div
          ref={sliderRef}
          className="flex gap-4 overflow-x-scroll no-scrollbar pb-3"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {games.map((game) => (
            <div key={game.id} style={{ scrollSnapAlign: 'start' }}>
              <GameCard
                game={game}
                isJoined={joinedRoomIds.has(game.id)}
                joining={joiningRoomId === game.id}
                onJoin={onJoin}
                onContinue={onContinue}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
