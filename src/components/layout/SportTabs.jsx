const SPORTS = [
  { key: 'nba',    label: 'NBA',    active: true },
  { key: 'ncaa',   label: 'NCAA',   active: true },
  { key: 'nhl',    label: 'NHL',    active: false },
  { key: 'nfl',    label: 'NFL',    active: false },
  { key: 'soccer', label: 'Soccer', active: false },
]

export default function SportTabs({ onTabClick }) {
  const handleClick = (sport) => {
    if (!sport.active) return
    if (onTabClick) {
      onTabClick(sport.key)
    } else {
      // Default: scroll to the sport section element by id
      const el = document.getElementById(`sport-section-${sport.key}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div
      className="flex items-center gap-1 overflow-x-auto px-4 pb-3"
      style={{ borderBottom: '1px solid #D5D0CA', scrollbarWidth: 'none' }}
    >
      {SPORTS.map((sport) => (
        <button
          key={sport.key}
          type="button"
          disabled={!sport.active}
          onClick={() => handleClick(sport)}
          className={`flex-shrink-0 flex items-center gap-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
            sport.active
              ? 'px-4 py-1.5 cursor-pointer'
              : 'px-3 py-1.5 cursor-not-allowed hover:bg-[#E3E0DC] hover:text-[#5C5752]'
          }`}
          style={
            sport.active
              ? { background: '#E44D2E', color: '#FFF' }
              : { color: '#9A9490' }
          }
        >
          {sport.label}
          {!sport.active && (
            <span
              className="font-bold uppercase"
              style={{ fontSize: 8, color: '#9A9490', letterSpacing: '0.1em' }}
            >
              SOON
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
