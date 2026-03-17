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
      const el = document.getElementById(`sport-section-${sport.key}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto px-4 pb-3"
      style={{ borderBottom: '1px solid #D5D0CA', scrollbarWidth: 'none' }}
    >
      {SPORTS.map((sport) => (
        <button
          key={sport.key}
          type="button"
          disabled={!sport.active}
          onClick={() => handleClick(sport)}
          className="flex-shrink-0 flex items-center gap-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all"
          style={
            sport.active
              ? {
                  background: '#E44D2E',
                  color: '#FFF',
                  padding: '5px 14px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(228,77,46,0.25)',
                }
              : {
                  color: '#B8B2AA',
                  padding: '5px 12px',
                  cursor: 'default',
                  border: '1px solid #E3E0DC',
                  borderRadius: 20,
                }
          }
        >
          {sport.label}
          {!sport.active && (
            <span
              style={{
                fontSize: 7.5,
                fontWeight: 800,
                color: '#C8C3BE',
                letterSpacing: '0.08em',
                border: '1px solid #D5D0CA',
                padding: '1px 4px',
                borderRadius: 3,
              }}
            >
              SOON
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
