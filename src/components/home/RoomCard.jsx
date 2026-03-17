function StatusBadge({ status }) {
  if (status === 'live') {
    return (
      <span
        className="inline-flex items-center gap-1.5"
        style={{
          background: 'rgba(220,38,38,0.10)',
          border: '1px solid rgba(220,38,38,0.22)',
          color: '#DC2626',
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
            background: '#DC2626',
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
          background: 'rgba(228,77,46,0.08)',
          border: '1px solid rgba(228,77,46,0.18)',
          color: '#E44D2E',
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
        background: '#E3E0DC',
        color: '#B8B2AA',
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

  const accentColor = isLive ? '#DC2626' : '#E44D2E'
  const showAccent = isLive || isLobby || isMyRoom

  return (
    <div
      className="flex flex-col justify-between rounded-xl transition-all duration-200"
      style={{
        background: '#F5F3F0',
        border: '1px solid #D5D0CA',
        borderLeft: showAccent ? `3px solid ${accentColor}` : '1px solid #D5D0CA',
        padding: showAccent ? '16px 20px 16px 18px' : '16px 20px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#B8B2AA'
        e.currentTarget.style.boxShadow = isLive
          ? '0 4px 20px rgba(220,38,38,0.12)'
          : '0 4px 20px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#D5D0CA'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="truncate font-semibold"
            style={{ color: '#2D2A26', fontSize: 14, lineHeight: 1.3 }}
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
            stroke="#B8B2AA"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span style={{ fontSize: 12, color: '#9A9490' }}>
            <span style={{ color: '#5C5752', fontWeight: 600 }}>
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
                border: '1px solid rgba(228,77,46,0.30)',
                color: '#E44D2E',
                background: 'rgba(228,77,46,0.06)',
                padding: '6px 16px',
                fontSize: 13,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(228,77,46,0.12)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(228,77,46,0.06)' }}
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
                background: '#E44D2E',
                color: '#FFF',
                padding: '6px 16px',
                fontSize: 13,
                boxShadow: '0 1px 4px rgba(228,77,46,0.28)',
              }}
              onMouseEnter={(e) => { if (!joining) e.currentTarget.style.background = '#F0705A' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#E44D2E' }}
            >
              {joining ? 'Joining…' : 'Join'}
            </button>
          )
        )}
      </div>
    </div>
  )
}
