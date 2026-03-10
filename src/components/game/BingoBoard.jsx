import { useEffect, useRef, useState } from 'react'
import BingoSquare from './BingoSquare.jsx'

const CONFETTI_COLORS = ['#FFD700', '#00D46E', '#8B5CF6', '#FF4757', '#00FF88', '#FF6B6B']

function BingoBoard({ squares = [], winningSquares = [], winningLines = [], hasBingo = false, onSquareClick }) {
  const flat = Array.isArray(squares[0]) ? squares.flat() : squares
  const winSet = new Set(winningSquares)

  const prevLineCountRef = useRef(winningLines.length)
  const [flashIndices, setFlashIndices] = useState(new Set())
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const prevCount = prevLineCountRef.current
    const newCount = winningLines.length
    prevLineCountRef.current = newCount

    if (newCount > prevCount && newCount > 0) {
      const newLines = winningLines.slice(prevCount)
      const indices = new Set()
      for (const line of newLines) {
        for (const idx of line) indices.add(idx)
      }

      setFlashIndices(indices)
      setTimeout(() => setFlashIndices(new Set()), 500)

      const lineNum = newCount
      setToast({ id: Date.now(), lineNum, exiting: false })
    }
  }, [winningLines.length])

  useEffect(() => {
    if (!toast || toast.exiting) return
    const dismiss = setTimeout(() => {
      setToast((t) => (t ? { ...t, exiting: true } : null))
    }, 2500)
    return () => clearTimeout(dismiss)
  }, [toast?.id])

  useEffect(() => {
    if (!toast?.exiting) return
    const remove = setTimeout(() => setToast(null), 250)
    return () => clearTimeout(remove)
  }, [toast?.exiting])

  return (
    <div className="relative w-full max-w-lg">
      {/* Machine frame */}
      <div className="rounded-2xl border-2 border-accent-gold/50 bg-gradient-to-b from-vegas-felt/80 via-bg-primary to-bg-primary p-3 sm:p-4 machine-glow">
        {/* Header strip */}
        <div className="mb-2 flex items-center justify-center">
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-accent-gold/60">
            Cowbell
          </span>
        </div>

        {/* 5x5 Grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {flat.slice(0, 25).map((square, index) => (
            <BingoSquare
              key={square?.id ?? index}
              square={square}
              index={index}
              isWinning={winSet.has(square?.id)}
              isLineFlash={flashIndices.has(index)}
              onClick={onSquareClick}
            />
          ))}
        </div>

        {/* Footer strip */}
        <div className="mt-2 flex items-center justify-center">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent-gold/20 to-transparent" />
        </div>
      </div>

      {/* Full-board BINGO overlay */}
      {hasBingo && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-bg-primary/90 backdrop-blur-sm"
          role="alert"
          aria-live="polite"
        >
          <div className="animate-bounce font-display text-3xl font-bold tracking-wide text-accent-gold">
            BINGO!
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            {winningLines.length} line{winningLines.length === 1 ? '' : 's'} completed
          </p>
        </div>
      )}

      {/* Per-line bingo toast */}
      {toast && (
        <div
          className={`absolute left-1/2 top-4 z-20 -translate-x-1/2 ${toast.exiting ? 'bingo-toast-exit' : 'bingo-toast-enter'}`}
        >
          <div className="relative overflow-hidden rounded-lg border border-accent-gold/50 bg-bg-secondary/95 px-5 py-2.5 shadow-lg backdrop-blur-sm">
            <div className="bingo-toast-confetti" aria-hidden="true">
              {CONFETTI_COLORS.map((color, i) => (
                <span
                  key={i}
                  style={{
                    background: color,
                    left: `${15 + i * 14}%`,
                    top: '-2px',
                    animationDelay: `${i * 60}ms`,
                  }}
                />
              ))}
            </div>
            <p className="font-display text-sm font-bold tracking-wide text-accent-gold">
              BINGO!
            </p>
            <p className="text-[10px] text-text-secondary">
              Line {toast.lineNum} completed!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default BingoBoard
