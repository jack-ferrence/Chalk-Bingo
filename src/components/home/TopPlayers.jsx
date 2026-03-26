import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getFontFamily, getBadge } from '../../lib/fontMap'

const RANK_COLORS = ['#ff6b35', '#e0e0f0', '#e0e0f0', '#555577', '#555577']

export default function TopPlayers() {
  const [players, setPlayers] = useState(null) // null = loading

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, username, total_earned, name_color, name_font, equipped_badge')
      .order('total_earned', { ascending: false })
      .limit(5)
      .then(({ data }) => setPlayers(data ?? []))
  }, [])

  const playerRows = players === null ? null : players.map((p, i) => {
    const badge = p.equipped_badge ? getBadge(p.equipped_badge) : null
    const name = (p.username ?? 'Guest').slice(0, 14)
    return { p, i, badge, name }
  })

  return (
    <>
      {/* ── Desktop: bordered box layout ── */}
      <div className="hidden md:block" style={{
        background: '#12121e',
        border: '1px solid #2a2a44',
        borderRadius: 6,
        padding: '10px 14px',
        fontFamily: 'var(--db-font-mono)',
      }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#555577', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>
          Top Players
        </p>
        {players === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} style={{ height: 26, borderRadius: 3, background: '#1a1a2e' }} />
            ))}
          </div>
        ) : players.length === 0 ? (
          <p style={{ fontSize: 11, color: '#555577' }}>No players yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {playerRows.map(({ p, i, badge, name }) => (
              <div
                key={p.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, height: 26, borderRadius: 3, padding: '0 4px', transition: 'background 0.1s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,107,53,0.04)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ width: 18, textAlign: 'right', fontSize: 11, fontWeight: 800, color: RANK_COLORS[i], flexShrink: 0 }}>{i + 1}</span>
                <span
                  className={p.name_color === 'rainbow' ? 'name-rainbow' : ''}
                  style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: p.name_color && p.name_color !== 'rainbow' ? p.name_color : '#c0c0d8', fontFamily: getFontFamily(p.name_font) }}
                >
                  {badge && <span style={{ fontSize: 11, marginRight: 3 }}>{badge.emoji}</span>}
                  {name}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#ff6b35', flexShrink: 0 }}>{(p.total_earned ?? 0).toLocaleString()} ◈</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Mobile: inline horizontal scroll ── */}
      <div className="block md:hidden">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 9, fontWeight: 700, color: '#555577', letterSpacing: '0.15em', flexShrink: 0, textTransform: 'uppercase' }}>
            Top Players
          </span>
          <div style={{ flex: 1, height: 1, background: '#1a1a2e' }} />
        </div>
        {players === null ? (
          <div style={{ height: 20, borderRadius: 3, background: '#12121e', width: '60%' }} />
        ) : players.length === 0 ? null : (
          <div className="leaderboard-scroll" style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 2, WebkitOverflowScrolling: 'touch' }}>
            {playerRows.map(({ p, i, badge, name }) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 10, fontWeight: 800, color: i === 0 ? '#ff6b35' : '#555577' }}>
                  {i + 1}
                </span>
                {badge && <span style={{ fontSize: 11 }}>{badge.emoji}</span>}
                <span
                  className={p.name_color === 'rainbow' ? 'name-rainbow' : ''}
                  style={{ fontFamily: 'var(--db-font-mono)', fontSize: 11, color: i === 0 ? '#e0e0f0' : '#8888aa', fontWeight: i === 0 ? 700 : 400 }}
                >
                  {name}
                </span>
                <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 10, color: '#3a3a55' }}>
                  {(p.total_earned ?? 0).toLocaleString()} ◈
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
