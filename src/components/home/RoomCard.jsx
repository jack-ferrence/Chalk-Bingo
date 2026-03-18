function StatusBadge({ status }) {
  if (status === 'live') {
    return (
      <span
        className="inline-flex items-center gap-1.5"
        style={{
          background: 'rgba(255,45,45,0.10)',
          border: '1px solid rgba(255,45,45,0.22)',
          color: '#ff2d2d',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.10em',
          padding: '3px 8px',
          borderRadius: 5,
          textTransform: 'uppercase',
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#ff2d2d',
            display: 'inline-block',
            animation: 'pulse-live 1.4s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
        Live
      </span>
    )
  }
  if (status === 'lobby') {
    return (
      <span
        style={{
          background: 'rgba(255,107,53,0.08)',
          border: '1px solid rgba(255,107,53,0.18)',
          color: '#ff6b35',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.10em',
          padding: '3px 8px',
          borderRadius: 5,
          textTransform: 'uppercase',
          display: 'inline-block',
        }}
      >
        Lobby
      </span>
    )
  }
  return (
    <span
      style={{
        background: '#2a2a44',
        color: '#555577',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.10em',
        padding: '3px 8px',
        borderRadius: 5,
        textTransform: 'uppercase',
        display: 'inline-block',
      }}
    >
      Finished
    </span>
  )
}

export default function RoomCard({ room, onJoin, onContinue, isMyRoom, joining }) {
  const isLive = room.status === 'live'
  const isLobby = room.status === 'lobby'
  const isFinished = room.status === 'finished'

  const accentColor = isLive ? '#ff2d2d' : '#ff6b35'
  const showAccent = isLive || isLobby || isMyRoom

  return (
    <div
      className="flex flex-col justify-between rounded-xl transition-all duration-200"
      style={{
        background: '#1a1a2e',
        border: '1px solid #2a2a44',
        borderLeft: showAccent ? `3px solid ${accentColor}` : '1px solid #2a2a44',
        padding: showAccent ? '16px 20px 16px 18px' : '16px 20px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#555577'
        e.currentTarget.style.boxShadow = isLive
          ? '0 4px 20px rgba(255,45,45,0.12)'
          : '0 4px 20px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2a2a44'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="truncate font-semibold"
            style={{ color: '#e0e0f0', fontSize: 14, lineHeight: 1.3 }}
          >
            {room.name}
          </h3>
        </div>
        <StatusBadge status={room.status} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#555577"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span style={{ fontSize: 12, color: '#555577' }}>
            <span style={{ color: '#8888aa', fontWeight: 600 }}>
              {room.participant_count ?? 0}
            </span>{' '}
            {(room.participant_count ?? 0) === 1 ? 'player' : 'players'}
          </span>
        </div>

        {!isFinished && (
          isMyRoom ? (
            <button
              type="button"
              onClick={() => onContinue(room.id)}
              className="inline-flex items-center justify-center rounded-lg text-sm font-bold transition-all"
              style={{
                border: '1px solid rgba(255,107,53,0.30)',
                color: '#ff6b35',
                background: 'rgba(255,107,53,0.06)',
                padding: '6px 16px',
                fontSize: 13,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,107,53,0.12)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,107,53,0.06)' }}
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onJoin(room.id)}
              disabled={joining}
              className="inline-flex items-center justify-center rounded-lg font-bold transition-all disabled:cursor-not-allowed disabled:opacity-55"
              style={{
                background: '#ff6b35',
                color: '#0c0c14',
                padding: '6px 16px',
                fontSize: 13,
                boxShadow: '0 1px 4px rgba(255,107,53,0.28)',
              }}
              onMouseEnter={(e) => { if (!joining) e.currentTarget.style.background = '#ff8855' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#ff6b35' }}
            >
              {joining ? 'Joining…' : 'Join'}
            </button>
          )
        )}
      </div>
    </div>
  )
}
