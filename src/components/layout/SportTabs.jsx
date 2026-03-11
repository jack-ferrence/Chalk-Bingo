const SPORTS = [
  { key: 'nba', label: 'NBA', active: true },
  { key: 'ncaa', label: 'NCAA', active: false },
  { key: 'nhl', label: 'NHL', active: false },
  { key: 'nfl', label: 'NFL', active: false },
  { key: 'soccer', label: 'Soccer', active: false },
]

export default function SportTabs() {
  return (
    <div
      className="flex items-center gap-1 overflow-x-auto px-4 pb-3"
      style={{ borderBottom: '1px solid #1E293B', scrollbarWidth: 'none' }}
    >
      {SPORTS.map((sport) => (
        <button
          key={sport.key}
          type="button"
          disabled={!sport.active}
          className={`flex-shrink-0 flex items-center gap-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
            sport.active
              ? 'px-4 py-1.5 cursor-default'
              : 'px-3 py-1.5 cursor-not-allowed hover:bg-[#1A2235] hover:text-[#94A3B8]'
          }`}
          style={
            sport.active
              ? { background: '#00E676', color: '#0A0E17' }
              : { color: '#64748B' }
          }
        >
          {sport.label}
          {!sport.active && (
            <span
              className="font-bold uppercase"
              style={{ fontSize: 8, color: '#475569', letterSpacing: '0.1em' }}
            >
              SOON
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
