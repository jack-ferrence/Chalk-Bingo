import { memo, useEffect, useRef, useState } from 'react'

const BingoSquare = memo(function BingoSquare({ square, index, isWinning, isLineFlash, onClick }) {
  const isFree = index === 12
  const marked = square?.marked === true
  const displayText = square?.display_text ?? ''
  const prevMarkedRef = useRef(marked)
  const [justMarked, setJustMarked] = useState(false)

  useEffect(() => {
    if (marked && !prevMarkedRef.current) {
      setJustMarked(true)
      const t = setTimeout(() => setJustMarked(false), 500)
      prevMarkedRef.current = marked
      return () => clearTimeout(t)
    }
    prevMarkedRef.current = marked
  }, [marked])

  let playerLabel = ''
  let statLabel = displayText
  if (!isFree && displayText) {
    const match = displayText.match(/^(.+?)\s+(\d+\+?\s+\S+)$/)
    if (match) {
      playerLabel = match[1]
      statLabel = match[2]
    }
  }

  if (isFree) {
    return (
      <button
        type="button"
        className={`
          group relative flex aspect-square flex-col items-center justify-center
          rounded-md border border-accent-gold/60
          bg-gradient-to-br from-accent-gold/20 via-accent-gold/10 to-transparent
          select-none sq-free-glow
          ${isWinning ? 'sq-winning' : ''}
          ${isLineFlash ? 'sq-line-flash' : ''}
        `}
      >
        <span className="font-display text-sm font-bold tracking-widest text-accent-gold">
          ★
        </span>
        <span className="font-display text-[10px] font-bold tracking-wider text-accent-gold">
          FREE
        </span>
      </button>
    )
  }

  if (marked) {
    return (
      <button
        type="button"
        onClick={() => onClick?.(square)}
        className={`
          group relative flex aspect-square flex-col items-center justify-center gap-0.5
          rounded-md border border-vegas-neon/70
          bg-[radial-gradient(circle_at_center,_rgba(0,255,136,0.15)_0%,_rgba(10,61,42,0.4)_70%,_rgba(15,17,24,0.9)_100%)]
          px-1 select-none cursor-pointer overflow-hidden
          sq-marked-glow
          ${justMarked ? 'sq-mark-in sq-shine' : ''}
          ${isWinning ? 'sq-winning' : ''}
          ${isLineFlash ? 'sq-line-flash' : ''}
        `}
      >
        {playerLabel && (
          <span className="w-full truncate text-center text-[8px] font-medium text-vegas-neon/80">
            {playerLabel}
          </span>
        )}
        <span className="font-display text-[10px] font-bold leading-tight text-accent-gold">
          {statLabel}
        </span>
        <span className="absolute right-0.5 top-0.5 text-[8px] text-vegas-neon">✓</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onClick?.(square)}
      className={`
        group relative flex aspect-square flex-col items-center justify-center gap-0.5
        rounded-md border border-border-active
        bg-gradient-to-br from-bg-card to-bg-secondary
        px-1 select-none cursor-pointer
        transition-all duration-150 ease-out
        hover:border-text-muted hover:scale-[1.02]
        card-bevel
      `}
    >
      {playerLabel && (
        <span className="w-full truncate text-center text-[8px] font-medium text-text-secondary">
          {playerLabel}
        </span>
      )}
      <span className="font-display text-[10px] font-medium leading-tight text-text-primary">
        {statLabel}
      </span>
    </button>
  )
})

export default BingoSquare
