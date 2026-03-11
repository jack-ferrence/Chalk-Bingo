import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'

function formatTipoff(dateStr) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

function StatusDot({ status }) {
  if (status === 'live') {
    return (
      <span
        className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full animate-pulse"
        style={{ background: '#EF4444' }}
      />
    )
  }
  if (status === 'lobby') {
    return (
      <span
        className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ background: '#00E676' }}
      />
    )
  }
  return (
    <span
      className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
      style={{ background: '#334155' }}
    />
  )
}

function SidebarContent({ onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const [myRooms, setMyRooms] = useState([])

  useEffect(() => {
    fetch('/.netlify/functions/get-games')
      .then((r) => r.json())
      .then((data) => setGames(data.games ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) { setMyRooms([]); return }
    const load = async () => {
      const [{ data: participants }, { data: rooms }] = await Promise.all([
        supabase.from('room_participants').select('room_id').eq('user_id', user.id),
        supabase.from('rooms_with_counts').select('*').in('status', ['lobby', 'live']).order('created_at', { ascending: false }),
      ])
      if (!participants || !rooms) return
      const joined = new Set(participants.map((p) => p.room_id))
      setMyRooms(rooms.filter((r) => joined.has(r.id)))
    }
    load()
  }, [user])

  const go = (path) => { navigate(path); onClose?.() }

  const rowStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, borderRadius: 6, padding: '6px 8px', cursor: 'pointer',
    transition: 'background 150ms, color 150ms',
    color: '#94A3B8', fontSize: 13, width: '100%', textAlign: 'left',
    background: 'transparent', border: 'none',
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto py-4 scrollbar-thin">
      {/* TONIGHT */}
      <section className="px-3 mb-5">
        <p
          className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ color: '#64748B' }}
        >
          Tonight
        </p>
        {games.length === 0 ? (
          <p className="px-2 text-xs" style={{ color: '#475569' }}>No games today</p>
        ) : (
          <ul className="space-y-0.5">
            {games.map((game) => (
              <li key={game.id}>
                <button
                  type="button"
                  style={rowStyle}
                  onClick={() => go('/games')}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1A2235'; e.currentTarget.style.color = '#F1F5F9' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' }}
                >
                  <span className="font-medium truncate">
                    {game.away.abbr} @ {game.home.abbr}
                  </span>
                  {game.isLive ? (
                    <span
                      className="flex items-center gap-1 flex-shrink-0 text-[10px] font-bold"
                      style={{ color: '#EF4444' }}
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                      Live
                    </span>
                  ) : game.isFinished ? (
                    <span className="flex-shrink-0 text-[10px]" style={{ color: '#475569' }}>Final</span>
                  ) : (
                    <span className="flex-shrink-0 text-[10px]" style={{ color: '#475569' }}>
                      {formatTipoff(game.date)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mx-3 mb-5" style={{ height: 1, background: '#1E293B' }} />

      {/* MY ROOMS */}
      <section className="px-3 mb-5">
        <p
          className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ color: '#64748B' }}
        >
          My Rooms
        </p>
        {!user ? (
          <p className="px-2 text-xs" style={{ color: '#475569' }}>
            <Link to="/login" onClick={() => onClose?.()} style={{ color: '#00E676' }}>
              Log in
            </Link>{' '}
            to see your rooms
          </p>
        ) : myRooms.length === 0 ? (
          <p className="px-2 text-xs" style={{ color: '#475569' }}>No active rooms</p>
        ) : (
          <ul className="space-y-0.5">
            {myRooms.map((room) => (
              <li key={room.id}>
                <button
                  type="button"
                  style={rowStyle}
                  onClick={() => go(`/room/${room.id}`)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1A2235'; e.currentTarget.style.color = '#F1F5F9' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' }}
                >
                  <span className="truncate font-medium" style={{ maxWidth: 130 }}>
                    {room.name}
                  </span>
                  <StatusDot status={room.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex-1" />

      {/* Bottom */}
      <div className="px-3 pt-4 space-y-1" style={{ borderTop: '1px solid #1E293B' }}>
        <Link
          to="/games"
          onClick={() => onClose?.()}
          className="flex items-center gap-2 rounded-md px-2 py-2 text-xs transition-colors"
          style={{ color: '#334155' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#64748B' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#334155' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How to Play
        </Link>
        <p className="px-2 text-[10px]" style={{ color: '#1E293B' }}>
          Chalk v0.1
        </p>
      </div>
    </div>
  )
}

export default function Sidebar({ open, onClose }) {
  const sidebarStyle = {
    background: '#111827',
    borderRight: '1px solid #1E293B',
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 overflow-hidden" style={sidebarStyle}>
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />
          <aside className="relative flex w-64 flex-col" style={sidebarStyle}>
            <div
              className="flex h-14 flex-shrink-0 items-center justify-between px-4"
              style={{ borderBottom: '1px solid #1E293B' }}
            >
              <span
                style={{
                  fontFamily: 'var(--ch-font-display)',
                  fontSize: 22,
                  letterSpacing: '0.15em',
                  color: '#00E676',
                }}
              >
                CHALK
              </span>
              <button
                type="button"
                onClick={onClose}
                style={{ color: '#64748B' }}
                aria-label="Close menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarContent onClose={onClose} />
          </aside>
        </div>
      )}
    </>
  )
}
