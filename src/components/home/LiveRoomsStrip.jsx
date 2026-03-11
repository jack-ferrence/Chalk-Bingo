import RoomCard from './RoomCard.jsx'

export default function LiveRoomsStrip({ liveRooms, myRoomIds, joiningRoomId, onJoin, onContinue }) {
  if (liveRooms.length === 0) return null

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 flex-shrink-0 rounded-full animate-pulse"
          style={{ background: '#EF4444' }}
        />
        <h2
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: '#F1F5F9' }}
        >
          Live Now
        </h2>
        <span className="text-xs" style={{ color: '#64748B' }}>
          {liveRooms.length} active
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {liveRooms.map((room) => (
          <div key={room.id} className="w-64 flex-shrink-0">
            <RoomCard
              room={room}
              isMyRoom={myRoomIds.has(room.id)}
              joining={joiningRoomId === room.id}
              onJoin={onJoin}
              onContinue={onContinue}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
