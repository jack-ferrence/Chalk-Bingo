import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

/**
 * Fetches all open public rooms and the current user's joined rooms
 * (with card progress). Subscribes to realtime changes.
 *
 * Returns { allRooms, myRooms, loading, error, reload }
 */
export function useHomeData() {
  const { user } = useAuth()
  const [allRooms, setAllRooms] = useState([])
  const [myRooms, setMyRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // midnight Pacific = 08:00 UTC; if we're before that hour, "today" started yesterday
      const todayStart = new Date()
      todayStart.setUTCHours(8, 0, 0, 0)
      if (todayStart > new Date()) {
        todayStart.setUTCDate(todayStart.getUTCDate() - 1)
      }
      const todayCutoff = todayStart.toISOString()

      const [liveAndLobbyResult, todayFinishedResult, participantsResult] = await Promise.all([
        supabase
          .from('rooms_with_counts')
          .select('*')
          .eq('room_type', 'public')
          .in('status', ['lobby', 'live'])
          .order('starts_at', { ascending: true, nullsFirst: false }),
        supabase
          .from('rooms_with_counts')
          .select('*')
          .eq('room_type', 'public')
          .eq('status', 'finished')
          .gte('starts_at', todayCutoff)
          .order('starts_at', { ascending: true, nullsFirst: false }),
        user
          ? supabase
              .from('room_participants')
              .select('room_id')
              .eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
      ])

      if (liveAndLobbyResult.error) throw liveAndLobbyResult.error
      if (todayFinishedResult.error) throw todayFinishedResult.error

      const allRoomsData = [
        ...(liveAndLobbyResult.data ?? []),
        ...(todayFinishedResult.data ?? []),
      ]
      setAllRooms(allRoomsData)

      const participantData = participantsResult.data ?? []
      if (user && participantData.length > 0) {
        const joinedIds = participantData.map((p) => p.room_id)

        const [myRoomsResult, cardsResult] = await Promise.all([
          supabase
            .from('rooms_with_counts')
            .select('*')
            .in('id', joinedIds)
            .in('status', ['lobby', 'live', 'finished'])
            .order('starts_at', { ascending: false }),
          supabase
            .from('cards')
            .select('room_id, lines_completed, squares_marked')
            .eq('user_id', user.id)
            .in('room_id', joinedIds),
        ])

        const cardsByRoom = {}
        for (const card of cardsResult.data ?? []) {
          cardsByRoom[card.room_id] = card
        }

        setMyRooms(
          (myRoomsResult.data ?? []).map((room) => ({
            ...room,
            lines_completed: cardsByRoom[room.id]?.lines_completed ?? 0,
            squares_marked: cardsByRoom[room.id]?.squares_marked ?? 0,
          }))
        )
      } else {
        setMyRooms([])
      }
    } catch (err) {
      setError(err.message)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: reload on rooms or participant changes (debounced)
  const debounceRef = useRef(null)
  const debouncedLoad = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(), 600)
  }, [load])

  useEffect(() => {
    const roomsCh = supabase
      .channel('home-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, debouncedLoad)
      .subscribe()

    const participantsCh = supabase
      .channel('home-participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants' }, debouncedLoad)
      .subscribe()

    return () => {
      supabase.removeChannel(roomsCh)
      supabase.removeChannel(participantsCh)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [debouncedLoad])

  return { allRooms, myRooms, loading, error, reload: load }
}
