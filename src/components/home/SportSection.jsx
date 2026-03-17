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
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-3">
          {/* Cinnabar left-bar accent */}
          <div
            style={{
              width: 3,
              height: 30,
              background: '#E44D2E',
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
          <h2
            style={{
              fontFamily: 'var(--db-font-display)',
              fontSize: 26,
              lineHeight: 1,
              letterSpacing: '0.04em',
              color: '#2D2A26',
            }}
          >
            {label}
          </h2>
          {!loading && games.length > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#9A9490',
                background: '#E3E0DC',
                padding: '2px 8px',
                borderRadius: 10,
                letterSpacing: '0.03em',
              }}
            >
              {games.length}
            </span>
          )}
        </div>

        {games.length > 0 && !loading && (
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-semibold transition-colors"
            style={{ color: '#B8B2AA', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#5C5752' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#B8B2AA' }}
            onClick={handleSeeAll}
          >
            See all
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
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
          className="rounded-xl px-6 py-8 text-center"
          style={{
            border: '1px dashed #D5D0CA',
            background: 'rgba(0,0,0,0.015)',
          }}
        >
          <p className="text-sm" style={{ color: '#B8B2AA' }}>No games scheduled today</p>
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
