import { NBA_TEAM_COLORS, hexToRgba } from '../../constants/teamColors.js'

function parseTeams(name) {
  const parts = (name ?? '').split(' vs ')
  return {
    away: parts[0]?.trim() || '---',
    home: parts[1]?.trim() || '---',
  }
}

function formatTipoff(dateStr) {
  if (!dateStr) return 'Upcoming'
  try {
    return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return 'Upcoming'
  }
}

export default function GameCard({ game, isJoined, joining, onJoin, onContinue }) {
  const { away, home } = parseTeams(game.name)
  const homeColor = NBA_TEAM_COLORS[home] ?? NBA_TEAM_COLORS.DEFAULT
  const awayColor = NBA_TEAM_COLORS[away] ?? NBA_TEAM_COLORS.DEFAULT
  const isLive = game.status === 'live'

  return (
    <div
      className="game-card glass-card rounded-xl flex flex-col overflow-hidden"
      style={{
        width: 220,
        minHeight: 140,
        '--home-color': homeColor,
        '--team-glow': hexToRgba(homeColor, 0.35),
      }}
    >
      {/* LIVE badge — absolute top-right */}
      {isLive && (
        <div className="absolute top-2 right-2">
          <span className="live-badge">
            <span className="live-dot" />
            LIVE
          </span>
        </div>
      )}

      {/* Team matchup */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-1">
        <span className="team-abbr" style={{ color: awayColor }}>{away}</span>
        <span className="vs-text">VS</span>
        <span className="team-abbr" style={{ color: homeColor }}>{home}</span>
      </div>

      {/* Bottom: time/status + player count + CTA */}
      <div className="flex items-center justify-between px-4 pb-4 gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className="text-xs font-semibold"
            style={{ color: isLive ? '#EF4444' : '#94A3B8' }}
          >
            {isLive ? '● LIVE' : formatTipoff(game.starts_at)}
          </span>
          <span className="text-[11px]" style={{ color: '#64748B' }}>
            👥 {game.participant_count ?? 0} playing
          </span>
        </div>

        {isJoined ? (
          <button
            type="button"
            onClick={() => onContinue(game.id)}
            className="btn-joined"
          >
            JOINED ✓
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onJoin(game.id)}
            disabled={joining}
            className="btn-join"
          >
            {joining ? '…' : 'JOIN'}
          </button>
        )}
      </div>
    </div>
  )
}
