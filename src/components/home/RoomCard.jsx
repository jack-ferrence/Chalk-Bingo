function StatusBadge({ status }) {
  if (status === 'live') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ background: 'rgba(220,38,38,0.15)', color: '#DC2626' }}
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
        style={{ background: 'rgba(228,77,46,0.10)', color: '#E44D2E' }}
      >
        Lobby
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: '#E3E0DC', color: '#9A9490' }}
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
    ? '3px solid #DC2626'
    : isLobby || isMyRoom
    ? '3px solid #E44D2E'
    : 'none'

  const hoverShadow = isLive
    ? '0 4px 20px rgba(220,38,38,0.15)'
    : '0 4px 20px rgba(0,0,0,0.10)'

  return (
    <div
      className="flex flex-col justify-between rounded-xl p-5 transition-all duration-200"
      style={{
        background: '#F5F3F0',
        border: '1px solid #D5D0CA',
        borderLeft,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#B8B2AA'
        e.currentTarget.style.boxShadow = hoverShadow
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#D5D0CA'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold" style={{ color: '#2D2A26', fontSize: 15 }}>
            {room.name}
          </h3>
          <p className="mt-0.5 font-mono text-xs" style={{ color: '#9A9490' }}>
            {room.game_id}
          </p>
        </div>
        <StatusBadge status={room.status} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm" style={{ color: '#5C5752' }}>
          <span style={{ color: '#2D2A26', fontWeight: 600 }}>
            {room.participant_count ?? 0}
          </span>{' '}
          {(room.participant_count ?? 0) === 1 ? 'player' : 'players'}
        </span>

        {!isFinished && (
          isMyRoom ? (
            <button
              type="button"
              onClick={() => onContinue(room.id)}
              className="inline-flex items-center justify-center rounded-lg text-sm font-bold transition-colors hover:bg-[#E44D2E]/10 min-w-[100px]"
              style={{
                border: '1px solid #E44D2E',
                color: '#E44D2E',
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
              className="inline-flex items-center justify-center rounded-lg text-sm font-bold transition-colors hover:bg-[#F0705A] disabled:cursor-not-allowed disabled:opacity-60 min-w-[100px]"
              style={{
                background: '#E44D2E',
                color: '#FFF',
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
