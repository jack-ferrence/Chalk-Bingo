export default function MobileGameRow({ room, onOpenGame }) {
  const nameParts = (room.name ?? '').split(' vs ')
  const away = nameParts[0]?.trim() || '---'
  const home = nameParts[1]?.trim() || '---'
  const isLive = room.status === 'live'
  const isFinished = room.status === 'finished'

  return (
    <div
      onClick={() => onOpenGame(room.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        background: '#12121e',
        borderRadius: 6,
        borderLeft: isLive ? '3px solid #ff2d2d' : isFinished ? '3px solid #555577' : '3px solid transparent',
        cursor: 'pointer',
      }}
    >
      {/* Left: teams + status info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        <div style={{ flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 16, fontWeight: 800, color: '#8888aa', letterSpacing: '0.03em' }}>
            {away}
          </span>
          <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 10, color: '#2a2a44', margin: '0 5px' }}>
            vs
          </span>
          <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 16, fontWeight: 800, color: '#e0e0f0', letterSpacing: '0.03em' }}>
            {home}
          </span>
        </div>
        <div>
          {isLive ? (
            <div>
              <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, color: '#ff2d2d', fontWeight: 700 }}>
                ● LIVE
              </span>
              {room.game_clock && (
                <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, color: '#3a3a55', marginLeft: 6 }}>
                  {room.game_period ? `${room.sport === 'mlb' ? `Inn ${room.game_period}` : `Q${room.game_period}`} · ` : ''}{room.game_clock}
                </span>
              )}
            </div>
          ) : isFinished ? (
            <div>
              <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, color: '#555577', fontWeight: 700 }}>FINAL</span>
              {room.away_score != null && room.home_score != null && (
                <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, color: '#8888aa', marginLeft: 6 }}>
                  {room.away_score}-{room.home_score}
                </span>
              )}
            </div>
          ) : (
            <div>
              <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, color: '#555577' }}>
                {room.starts_at
                  ? new Date(room.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                  : 'Upcoming'}
              </span>
              <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, color: '#3a3a55', marginLeft: 6 }}>
                {room.participant_count ?? 0} joined
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: tap cue */}
      <div style={{ flexShrink: 0, marginLeft: 8 }}>
        {isFinished ? (
          <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, fontWeight: 700, color: '#555577' }}>VIEW →</span>
        ) : isLive ? (
          <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, fontWeight: 700, color: '#ff6b35' }}>PLAY →</span>
        ) : (
          <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, fontWeight: 700, color: '#3a3a55' }}>PLAY →</span>
        )}
      </div>
    </div>
  )
}
