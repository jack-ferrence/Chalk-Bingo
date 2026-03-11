import { useNavigate } from 'react-router-dom'

const SPORT_ICONS = {
  nba: '🏀',
  mlb: '⚾',
  nhl: '🏒',
  nfl: '🏈',
  march_madness: '🏆',
}

function formatStartsAt(dateStr) {
  if (!dateStr) return 'Lobby'
  try {
    const time = new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return `Starts ${time}`
  } catch {
    return 'Lobby'
  }
}

export default function MyGameItem({ room }) {
  const navigate = useNavigate()
  const isLive = room.status === 'live'
  const icon = SPORT_ICONS[room.sport ?? 'nba'] ?? '🏀'
  const lines = room.lines_completed ?? 0

  return (
    <button
      type="button"
      className="sidebar-game-item"
      onClick={() => navigate(`/room/${room.id}`)}
    >
      {/* Sport icon */}
      <span className="text-base flex-shrink-0" aria-hidden="true">
        {icon}
      </span>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p
          className="truncate text-sm font-semibold leading-tight"
          style={{ color: '#F1F5F9' }}
        >
          {room.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {isLive ? (
            <span className="live-badge" style={{ fontSize: 9, padding: '1px 5px' }}>
              <span className="live-dot" style={{ width: 5, height: 5 }} />
              LIVE
            </span>
          ) : (
            <span className="text-[11px]" style={{ color: '#64748B' }}>
              {formatStartsAt(room.starts_at)}
            </span>
          )}
          {lines > 0 && (
            <span className="text-[11px]" style={{ color: '#00E676' }}>
              {lines} {lines === 1 ? 'line' : 'lines'}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
