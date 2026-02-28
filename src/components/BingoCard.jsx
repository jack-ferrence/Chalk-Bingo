function BingoCard({ squares = [], winningSquares = [] }) {
  const flat = Array.isArray(squares[0]) ? squares.flat() : squares

  const isWinning = (squareId) => winningSquares.includes(squareId)

  return (
    <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-xl shadow-black/60">
      <div className="grid grid-cols-5 gap-1.5">
        {flat.map((square, index) => {
          const isCenter = index === 12
          const marked = square?.marked
          const winning = isWinning(square?.id)

          const baseClasses =
            'flex aspect-square flex-col items-center justify-center rounded-md border text-[10px] font-medium text-center px-1 select-none transition'

          const stateClasses = marked
            ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-100 shadow-inner shadow-emerald-500/40'
            : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-500/70 hover:bg-slate-900/80'

          const winningClasses = winning
            ? 'ring-2 ring-offset-2 ring-offset-slate-950 ring-amber-400'
            : ''

          return (
            <div
              key={square?.id ?? index}
              className={`${baseClasses} ${stateClasses} ${winningClasses}`}
            >
              <span
                className={`leading-tight ${
                  isCenter ? 'text-xs font-semibold tracking-wide' : ''
                }`}
              >
                {square?.display_text ?? ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BingoCard

