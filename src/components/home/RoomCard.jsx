function StatusBadge({ status }) {
  if (status === 'live') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
        Live
      </span>
    )
  }
  if (status === 'lobby') {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ background: 'rgba(0,230,118,0.1)', color: '#00E676' }}
      >
        Lobby
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: '#334155', color: '#64748B' }}
    >
      Finished
    </span>
  )
}

export default function RoomCard({ room, onJoin, onContinue, isMyRoom, joining }) {
  const isLive = room.status === 'live'
  const isLobby = room.status === 'lobby'
  const isFinished = room.status === 'finished'

  const borderLeft = isLive
    ? '3px solid #EF4444'
    : isLobby || isMyRoom
    ? '3px solid #00E676'
    : 'none'

  const hoverShadow = isLive
    ? '0 4px 20px rgba(239,68,68,0.15)'
    : '0 4px 20px rgba(0,0,0,0.3)'

  return (
    <div
      className="flex flex-col justify-between rounded-xl p-5 transition-all duration-200"
      style={{
        background: '#111827',
        border: '1px solid #1E293B',
        borderLeft,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#334155'
        e.currentTarget.style.boxShadow = hoverShadow
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#1E293B'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold" style={{ color: '#F1F5F9', fontSize: 15 }}>
            {room.name}
          </h3>
          <p className="mt-0.5 font-mono text-xs" style={{ color: '#64748B' }}>
            {room.game_id}
          </p>
        </div>
        <StatusBadge status={room.status} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm" style={{ color: '#94A3B8' }}>
          <span style={{ color: '#F1F5F9', fontWeight: 600 }}>
            {room.participant_count ?? 0}
          </span>{' '}
          {(room.participant_count ?? 0) === 1 ? 'player' : 'players'}
        </span>

        {!isFinished && (
          isMyRoom ? (
            <button
              type="button"
              onClick={() => onContinue(room.id)}
              className="inline-flex items-center justify-center rounded-lg text-sm font-bold transition-colors hover:bg-[#00E676]/10 min-w-[100px]"
              style={{
                border: '1px solid #00E676',
                color: '#00E676',
                padding: '7px 16px',
              }}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onJoin(room.id)}
              disabled={joining}
              className="inline-flex items-center justify-center rounded-lg text-sm font-bold transition-colors hover:bg-[#69F0AE] disabled:cursor-not-allowed disabled:opacity-60 min-w-[100px]"
              style={{
                background: '#00E676',
                color: '#0A0E17',
                padding: '7px 16px',
              }}
            >
              {joining ? 'Joining…' : 'Join'}
            </button>
          )
        )}
      </div>
    </div>
  )
}
