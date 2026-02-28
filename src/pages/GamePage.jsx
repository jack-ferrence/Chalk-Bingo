import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import BingoCard from '../components/BingoCard.jsx'
import RecentEvents from '../components/RecentEvents.jsx'
import { generateCard } from '../game/cardGenerator.js'
import { checkBingo } from '../game/statProcessor.js'

const MOCK_PLAYERS = [
  { id: 'player_lebron', name: 'LeBron James' },
  { id: 'player_curry', name: 'Stephen Curry' },
  { id: 'player_giannis', name: 'Giannis Antetokounmpo' },
  { id: 'player_jokic', name: 'Nikola Jokić' },
  { id: 'player_durant', name: 'Kevin Durant' },
  { id: 'player_tatum', name: 'Jayson Tatum' },
  { id: 'player_doncic', name: 'Luka Dončić' },
  { id: 'player_embiid', name: 'Joel Embiid' },
  { id: 'player_booker', name: 'Devin Booker' },
  { id: 'player_mitchell', name: 'Donovan Mitchell' },
]

const DEFAULT_STAT_TYPES = [
  'points_10',
  'points_15',
  'three_pointer',
  'rebound',
  'assist',
  'steal',
  'block',
]

function GamePage() {
  const { roomId } = useParams()
  const { user, loading: authLoading } = useAuth()

  const [room, setRoom] = useState(null)
  const [card, setCard] = useState(null)
  const [loadingRoom, setLoadingRoom] = useState(true)
  const [loadingCard, setLoadingCard] = useState(true)
  const [error, setError] = useState('')
  const [gameStartedNotification, setGameStartedNotification] = useState(false)
  const [leaderboard, setLeaderboard] = useState(null)
  const prevStatusRef = useRef(null)

  useEffect(() => {
    if (!roomId) return

    const loadRoom = async () => {
      setLoadingRoom(true)
      setError('')

      const { data, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle()

      if (roomError) {
        setError(roomError.message)
        setLoadingRoom(false)
        return
      }

      setRoom(data)
      setLoadingRoom(false)
    }

    loadRoom()
  }, [roomId])

  // Realtime: subscribe to this room so all participants see status changes
  useEffect(() => {
    if (!roomId) return

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoom((prev) => (prev?.id === payload.new?.id ? { ...prev, ...payload.new } : prev))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  // Show "Game Started!" when status transitions to live
  useEffect(() => {
    const prev = prevStatusRef.current
    const next = room?.status
    prevStatusRef.current = next
    if (next === 'live' && prev !== 'live') {
      setGameStartedNotification(true)
      const t = setTimeout(() => setGameStartedNotification(false), 4000)
      return () => clearTimeout(t)
    }
  }, [room?.status])

  // Fetch leaderboard when game is finished
  useEffect(() => {
    if (room?.status !== 'finished' || !roomId) return

    const fetchLeaderboard = async () => {
      const { data: participants } = await supabase
        .from('room_participants')
        .select('user_id')
        .eq('room_id', roomId)

      if (!participants?.length) {
        setLeaderboard([])
        return
      }

      const userIds = participants.map((p) => p.user_id)
      const { data: cardsData } = await supabase
        .from('cards')
        .select('user_id, lines_completed, squares_marked')
        .eq('room_id', roomId)
        .in('user_id', userIds)

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds)

      const profileMap = Object.fromEntries((profilesData ?? []).map((p) => [p.id, p.username]))
      const cardMap = Object.fromEntries(
        (cardsData ?? []).map((c) => [c.user_id, { lines_completed: c.lines_completed, squares_marked: c.squares_marked }])
      )

      const rows = userIds.map((uid) => ({
        user_id: uid,
        username: profileMap[uid] ?? 'Guest',
        lines_completed: cardMap[uid]?.lines_completed ?? 0,
        squares_marked: cardMap[uid]?.squares_marked ?? 0,
      }))
      rows.sort((a, b) => b.lines_completed - a.lines_completed)
      setLeaderboard(rows)
    }

    fetchLeaderboard()
  }, [room?.status, roomId])

  useEffect(() => {
    if (!roomId || !user || authLoading) return

    const loadOrCreateCard = async () => {
      setLoadingCard(true)
      setError('')

      const { data, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (cardError) {
        setError(cardError.message)
        setLoadingCard(false)
        return
      }

      if (data) {
        setCard(data)
        setLoadingCard(false)
        return
      }

      const generatedFlat = generateCard(MOCK_PLAYERS, DEFAULT_STAT_TYPES)
      const generatedGrid = [
        generatedFlat.slice(0, 5),
        generatedFlat.slice(5, 10),
        generatedFlat.slice(10, 15),
        generatedFlat.slice(15, 20),
        generatedFlat.slice(20, 25),
      ]

      const { data: inserted, error: insertError } = await supabase
        .from('cards')
        .insert({
          room_id: roomId,
          user_id: user.id,
          squares: generatedGrid,
          lines_completed: 0,
          squares_marked: 1, // free space
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        setLoadingCard(false)
        return
      }

      setCard(inserted)
      setLoadingCard(false)
    }

    loadOrCreateCard()
  }, [roomId, user, authLoading])

  // Realtime: subscribe to this card's row so we get live square updates
  useEffect(() => {
    if (!card?.id) return

    const channel = supabase
      .channel(`card:${card.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cards',
          filter: `id=eq.${card.id}`,
        },
        (payload) => {
          setCard((prev) => (prev?.id === payload.new?.id ? { ...prev, ...payload.new } : prev))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [card?.id])

  // Derive bingo state from current card squares
  const flatSquares = useMemo(() => {
    if (!card?.squares) return []
    return Array.isArray(card.squares[0]) ? card.squares.flat() : card.squares.slice(0, 25)
  }, [card?.squares])

  const bingoResult = useMemo(
    () => (flatSquares.length >= 25 ? checkBingo(card.squares) : { hasBingo: false, winningLines: [] }),
    [card?.squares, flatSquares.length]
  )

  const winningSquareIds = useMemo(() => {
    const ids = new Set()
    for (const line of bingoResult.winningLines || []) {
      for (const idx of line) {
        const sq = flatSquares[idx]
        if (sq?.id) ids.add(sq.id)
      }
    }
    return Array.from(ids)
  }, [bingoResult.winningLines, flatSquares])

  const isCreator = room?.created_by === user?.id

  const handleStartGame = async () => {
    if (!roomId || !isCreator) return
    setError('')
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ status: 'live' })
      .eq('id', roomId)
    if (updateError) setError(updateError.message)
  }

  const handleEndGame = async () => {
    if (!roomId || !isCreator) return
    setError('')
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ status: 'finished' })
      .eq('id', roomId)
    if (updateError) setError(updateError.message)
  }

  const roomStatusLabel =
    room?.status === 'live'
      ? 'Live'
      : room?.status === 'finished'
        ? 'Finished'
        : 'Lobby'

  const roomStatusClasses =
    room?.status === 'live'
      ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40'
      : room?.status === 'finished'
        ? 'bg-slate-700/40 text-slate-300 ring-1 ring-slate-600/60'
        : 'bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/40'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            {room?.name || 'Game room'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Room ID:{' '}
            <span className="font-mono text-slate-200">{roomId}</span>
          </p>
          {room?.game_id && (
            <p className="mt-1 text-xs text-slate-500">
              Game ID:{' '}
              <span className="font-mono text-slate-300">
                {room.game_id}
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {isCreator && room?.status !== 'finished' && (
            <div className="flex gap-2">
              {room?.status === 'lobby' && (
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-950 shadow-sm hover:bg-emerald-400"
                >
                  Start Game
                </button>
              )}
              <button
                type="button"
                onClick={handleEndGame}
                className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
              >
                End Game
              </button>
            </div>
          )}
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${roomStatusClasses}`}
          >
            {roomStatusLabel}
          </span>
        </div>
      </div>

      {gameStartedNotification && (
        <div
          className="rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-4 py-3 text-center text-sm font-medium text-emerald-200 animate-in-from-top"
          role="status"
          aria-live="polite"
        >
          Game Started!
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Your bingo card
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Generated from a mock roster. In production, this will use the
            live game&apos;s players and stat events.
          </p>

          <div className="mt-4 flex items-center justify-center">
            {loadingCard ? (
              <div className="text-sm text-slate-400">
                Loading your card...
              </div>
            ) : card ? (
              <div className="relative">
                <BingoCard
                  squares={card.squares}
                  winningSquares={winningSquareIds}
                />
                {bingoResult.hasBingo && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-slate-950/90 backdrop-blur-sm"
                    role="alert"
                    aria-live="polite"
                  >
                    <div className="animate-bounce text-2xl font-bold tracking-wide text-amber-400">
                      BINGO!
                    </div>
                    <p className="mt-2 text-sm text-slate-300">
                      {bingoResult.winningLines?.length ?? 0} line
                      {(bingoResult.winningLines?.length ?? 0) === 1 ? '' : 's'} completed
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-400">
                No card available.
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <RecentEvents gameId={room?.game_id} />
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
              Player
            </h2>
            <p className="mt-1 text-sm text-slate-200">
              {user?.email ?? 'Unknown player'}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
              Game status
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {bingoResult.hasBingo
                ? `${bingoResult.winningLines?.length ?? 0} line(s) completed — Bingo!`
                : 'Winning lines and live stats appear here as the game progresses.'}
            </p>
          </div>
        </aside>
      </div>

      {room?.status === 'finished' && leaderboard && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Final leaderboard"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-100">Final Leaderboard</h2>
            <p className="mt-1 text-xs text-slate-400">Ranked by lines completed</p>
            <ul className="mt-4 space-y-2">
              {leaderboard.map((row, i) => (
                <li
                  key={row.user_id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
                >
                  <span className="font-medium text-slate-200">
                    {i + 1}. {row.username}
                  </span>
                  <span className="text-sm text-slate-400">
                    {row.lines_completed} line{(row.lines_completed === 1 ? '' : 's')} · {row.squares_marked} marked
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default GamePage

