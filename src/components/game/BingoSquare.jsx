import { memo, useEffect, useRef, useState } from 'react'
import DaubOverlay from './DaubOverlay.jsx'
import { NBA_TEAM_COLORS, MLB_TEAM_COLORS, NCAA_TEAM_COLORS } from '../../constants/teamColors.js'

function getTeamColor(abbr, sport) {
  if (!abbr) return null
  if (sport === 'mlb') return MLB_TEAM_COLORS[abbr] ?? null
  if (sport === 'ncaa') return NCAA_TEAM_COLORS[abbr] ?? null
  return NBA_TEAM_COLORS[abbr] ?? null
}

const BingoSquare = memo(function BingoSquare({
  square,
  index,
  isWinning,
  isLineFlash,
  onClick,
  isLobby = false,
  onSwapRequest,
  isSwapping = false,
  swapsExhausted = false,
  nextSwapCost = 10,
  daubStyle = 'classic',
  sport = 'nba',
}) {
  const isFree = index === 12
  const marked = square?.marked === true
  const displayText = square?.display_text ?? ''
  const prevMarkedRef = useRef(marked)
  const [justMarked, setJustMarked] = useState(false)
  const [hovered, setHovered] = useState(false)

  // Long-press state for mobile swap
  const longPressTimer = useRef(null)
  const longPressFired = useRef(false)
  const touchStartPos = useRef({ x: 0, y: 0 })

  function handleTouchStart(e) {
    if (!isLobby || swapsExhausted) return
    longPressFired.current = false
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      onSwapRequest?.(square, index)
    }, 500)
  }

  function cancelLongPress() {
    clearTimeout(longPressTimer.current)
  }

  function handleTouchMove(e) {
    const dx = e.touches[0].clientX - touchStartPos.current.x
    const dy = e.touches[0].clientY - touchStartPos.current.y
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) cancelLongPress()
  }

  function handleTouchEnd(e) {
    cancelLongPress()
    if (longPressFired.current) {
      e.preventDefault()
      longPressFired.current = false
    }
  }

  useEffect(() => {
    if (marked && !prevMarkedRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJustMarked(true)
      const t = setTimeout(() => setJustMarked(false), 500)
      prevMarkedRef.current = marked
      return () => clearTimeout(t)
    }
    prevMarkedRef.current = marked
  }, [marked])

  // Parse display_text into player name + stat line
  let playerLabel = ''
  let statLabel = displayText
  if (!isFree && displayText) {
    const match = displayText.match(/^(.+?)\s+([\d.]+\+?\s+\S+)$/)
    if (match) {
      playerLabel = match[1]
      statLabel = match[2]
    }
  }

  const teamAbbr = square?.team_abbr ?? ''
  const teamColor = getTeamColor(teamAbbr, sport)

  const TIER_COLORS = {
    1: '#22c55e', easy: '#22c55e',
    2: '#3b82f6', medium: '#3b82f6',
    3: '#f59e0b', hard: '#f59e0b',
    longshot: '#ef4444',
  }
  const tierColor = square?.tier ? TIER_COLORS[square.tier] : null
  const tierPct = square?.implied_prob != null ? Math.round(square.implied_prob * 100) : null

  const odds = square?.american_odds
  const oddsLabel = odds != null ? `(${odds > 0 ? '+' : ''}${odds})` : null

  // ── FREE square ──────────────────────────────────────────────────────────────
  if (isFree) {
    return (
      <button
        type="button"
        className={`select-none sq-free-glow ${isWinning ? 'sq-winning' : ''} ${isLineFlash ? 'sq-line-flash' : ''}`}
        style={{
          aspectRatio: '4/5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ff6b35',
          border: '1px solid #ff8855',
          borderRadius: 4,
          cursor: 'default',
        }}
      >
        <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 13, fontWeight: 900, color: '#0c0c14' }}>★</span>
        <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: '#0c0c14' }}>FREE</span>
      </button>
    )
  }

  // ── Swap loading state ───────────────────────────────────────────────────────
  if (isSwapping) {
    return (
      <div
        style={{
          aspectRatio: '4/5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a2e',
          border: '1px solid #ff6b35',
          borderRadius: 4,
          opacity: 0.7,
        }}
      >
        <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 14, color: '#ff6b35', animation: 'spin 1s linear infinite' }}>⟳</span>
      </div>
    )
  }

  // ── Marked square ────────────────────────────────────────────────────────────
  if (marked) {
    return (
      <button
        type="button"
        onClick={() => onClick?.(square, index)}
        className={`select-none sq-marked-glow ${justMarked ? 'sq-mark-in sq-shine' : ''} ${isWinning ? 'sq-winning' : ''} ${isLineFlash ? 'sq-line-flash' : ''}`}
        style={{
          aspectRatio: '4/5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          background: '#2a1a10',
          border: '1px solid #ff6b35',
          borderLeft: '3px solid #ff6b35',
          borderRadius: 4,
          padding: '4px 6px',
          cursor: 'pointer',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {playerLabel && (
          <span className="sq-player" style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', fontFamily: 'var(--db-font-mono)', fontSize: 8, fontWeight: 700, color: 'rgba(255,107,53,0.8)' }}>
            {playerLabel}
          </span>
        )}
        {teamAbbr && (
          <span className="sq-team" style={{ fontFamily: 'var(--db-font-mono)', fontSize: 8, fontWeight: 600, color: 'rgba(255,107,53,0.5)', letterSpacing: '0.06em' }}>
            {teamAbbr}
          </span>
        )}
        <span className="sq-stat" style={{ fontFamily: 'var(--db-font-mono)', fontSize: 11, fontWeight: 900, color: '#ff6b35', lineHeight: 1.2, textAlign: 'center' }}>
          {statLabel}
        </span>
        {oddsLabel && (
          <span className="sq-odds" style={{ fontFamily: 'var(--db-font-mono)', fontSize: 8, color: 'rgba(255,107,53,0.5)', lineHeight: 1 }}>
            {oddsLabel}
          </span>
        )}
        {daubStyle === 'classic' && (
          <span style={{ position: 'absolute', right: 3, top: 2, fontSize: 8, color: '#ff6b35' }}>✓</span>
        )}
        <DaubOverlay style={daubStyle} animated={justMarked} />
        {tierColor && (
          <span
            title={tierPct != null ? `${square.tier} — ${tierPct}%` : square.tier}
            style={{ position: 'absolute', left: 3, top: 3, width: 4, height: 4, borderRadius: '50%', background: tierColor, opacity: 0.7, flexShrink: 0 }}
          />
        )}
      </button>
    )
  }

  // ── Normal (unmarked) square ─────────────────────────────────────────────────
  const showSwapBtn = isLobby && hovered && !swapsExhausted
  const accentColor = teamColor ?? '#2a2a44'

  return (
    <button
      type="button"
      onClick={() => { if (longPressFired.current) { longPressFired.current = false; return } onClick?.(square, index) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={cancelLongPress}
      onContextMenu={(e) => { if (isLobby) e.preventDefault() }}
      className="select-none"
      style={{
        aspectRatio: '4/5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        background: hovered ? '#22223a' : '#1a1a2e',
        border: `1px solid ${hovered ? '#3a3a55' : '#2a2a44'}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 4,
        padding: '4px 6px',
        cursor: 'pointer',
        transition: 'background 100ms ease, border-color 100ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {playerLabel && (
        <span className="sq-player" style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', fontFamily: 'var(--db-font-mono)', fontSize: 11, fontWeight: 700, color: '#c0c0d8' }}>
          {playerLabel}
        </span>
      )}
      {teamAbbr && (
        <span className="sq-team" style={{ fontFamily: 'var(--db-font-mono)', fontSize: 8, fontWeight: 600, color: teamColor ?? '#555577', letterSpacing: '0.06em' }}>
          {teamAbbr}
        </span>
      )}
      <span className="sq-stat" style={{ fontFamily: 'var(--db-font-mono)', fontSize: 14, fontWeight: 900, color: '#e0e0f0', lineHeight: 1.2, textAlign: 'center' }}>
        {statLabel}
      </span>
      {oddsLabel && (
        <span className="sq-odds" style={{ fontFamily: 'var(--db-font-mono)', fontSize: 8, fontWeight: 500, color: '#555577', lineHeight: 1 }}>
          {oddsLabel}
        </span>
      )}

      {/* Injury replacement indicator */}
      {square?.replaced_injury && (
        <span
          title="Replaced — player ruled out"
          style={{ position: 'absolute', top: 2, left: 5, fontSize: 7, color: '#ff6b35', opacity: 0.6 }}
        >
          ♻
        </span>
      )}

      {/* Tier difficulty dot */}
      {tierColor && (
        <span
          title={tierPct != null ? `${square.tier} — ${tierPct}%` : square.tier}
          style={{ position: 'absolute', right: 3, top: 3, width: 4, height: 4, borderRadius: '50%', background: tierColor, opacity: 0.7, flexShrink: 0 }}
        />
      )}

      {/* Mobile swap hint — lobby only */}
      {isLobby && !swapsExhausted && !showSwapBtn && (
        <span className="sq-swap-hint">↻</span>
      )}

      {/* Swap button — lobby only, shown on hover */}
      {showSwapBtn && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSwapRequest?.(square, index)
          }}
          title="Swap this square"
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: 'rgba(42,42,68,0.9)',
            color: '#8888aa',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--db-font-mono)',
            fontSize: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            padding: 0,
            zIndex: 2,
            transition: 'background 100ms ease, color 100ms ease',
          }}
          onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.style.background = '#ff6b35'; e.currentTarget.style.color = '#0c0c14' }}
          onMouseLeave={(e) => { e.stopPropagation(); e.currentTarget.style.background = 'rgba(42,42,68,0.9)'; e.currentTarget.style.color = '#8888aa' }}
        >
          ↻
        </button>
      )}
    </button>
  )
})

export default BingoSquare
