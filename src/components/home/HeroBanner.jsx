import { useNavigate } from 'react-router-dom'

export default function HeroBanner() {
  const navigate = useNavigate()

  return (
    <div
      className="relative overflow-hidden rounded-xl p-8 md:p-10"
      style={{
        background: '#111827',
        borderLeft: '2px solid #00E676',
      }}
    >
      {/* Radial green ambient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 20% 50%, rgba(0,230,118,0.06) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-lg">
        <p
          className="mb-3 text-xs font-bold uppercase"
          style={{ color: '#00E676', letterSpacing: '0.2em' }}
        >
          NBA Bingo — Free to Play
        </p>
        <h1
          style={{
            fontFamily: 'var(--ch-font-display)',
            fontSize: 'clamp(38px, 5.5vw, 60px)',
            color: '#F1F5F9',
            lineHeight: 1.05,
            letterSpacing: '0.02em',
          }}
        >
          The game you can&apos;t lose.
        </h1>
        <p
          className="mt-4 leading-relaxed"
          style={{ color: '#94A3B8', fontSize: 'clamp(14px, 2vw, 18px)', maxWidth: 460 }}
        >
          Live bingo cards powered by real NBA stats. Free to play. Every game.
        </p>
        <button
          type="button"
          onClick={() => navigate('/games')}
          className="mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold transition-all duration-200 hover:bg-[#69F0AE]"
          style={{
            background: '#00E676',
            color: '#0A0E17',
            boxShadow: '0 0 0 0 rgba(0,230,118,0)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(0,230,118,0.3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,230,118,0)' }}
        >
          Browse Tonight&apos;s Games →
        </button>
      </div>
    </div>
  )
}
