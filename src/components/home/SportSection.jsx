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
  const showSkeletons = loading || games.length === 0

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
        <button
          type="button"
          className="text-xs font-semibold transition-colors"
          style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'default' }}
        >
          See All
        </button>
      </div>

      {/* Horizontal slider */}
      <div
        className="flex gap-4 overflow-x-scroll no-scrollbar pb-3"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {showSkeletons
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div
                key={i}
                className="skeleton-card"
                style={{ scrollSnapAlign: 'start' }}
              />
            ))
          : games.map((game) => (
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
    </section>
  )
}
