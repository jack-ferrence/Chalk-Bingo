import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PLAYER_NAMES = {
  player_lebron: 'LeBron James',
  player_curry: 'Stephen Curry',
  player_giannis: 'Giannis Antetokounmpo',
  player_jokic: 'Nikola Jokić',
  player_durant: 'Kevin Durant',
  player_tatum: 'Jayson Tatum',
  player_doncic: 'Luka Dončić',
  player_embiid: 'Joel Embiid',
  player_booker: 'Devin Booker',
  player_mitchell: 'Donovan Mitchell',
}

function statTypeLabel(statType) {
  if (statType === 'points_10') return '10+ PTS'
  if (statType === 'points_15') return '15+ PTS'
  if (statType === 'three_pointer') return '3PT Made'
  if (statType === 'rebound') return 'Rebound'
  if (statType === 'assist') return 'Assist'
  if (statType === 'steal') return 'Steal'
  if (statType === 'block') return 'Block'
  return statType
}

const MAX_EVENTS = 5

function RecentEvents({ gameId }) {
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!gameId) return

    const fetchInitial = async () => {
      const { data } = await supabase
        .from('stat_events')
        .select('id, player_id, stat_type, value, fired_at')
        .eq('game_id', gameId)
        .order('fired_at', { ascending: false })
        .limit(MAX_EVENTS)
      setEvents(data ?? [])
    }

    fetchInitial()

    const channel = supabase
      .channel(`stat_events:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stat_events',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const row = payload.new
          if (row?.id)
            setEvents((prev) => [row, ...prev].slice(0, MAX_EVENTS))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId])

  if (!gameId) return null

  return (
    <div>
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
        Recent events
      </h2>
      <ul className="mt-2 space-y-1.5 overflow-hidden">
        {events.length === 0 ? (
          <li className="text-xs text-slate-500">No events yet.</li>
        ) : (
          events.map((ev) => (
            <li
              key={ev.id}
              className="animate-in-from-top rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-200"
            >
              <span className="font-medium text-sky-300">
                {PLAYER_NAMES[ev.player_id] ?? ev.player_id}
              </span>
              <span className="text-slate-400"> — </span>
              <span>{statTypeLabel(ev.stat_type)}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export default RecentEvents
