import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'

const STAT_BATCH_MS = 500
const MAX_CHAT = 100

/**
 * Single multiplexed Supabase Realtime channel per room.
 * Listens to: rooms, cards, stat_events, chat_messages, room_participants.
 * Returns dispatched data + stable callbacks for child components.
 *
 * userId should be the authenticated user's UUID (from useAuth), not
 * card?.id. The user id is stable from the moment auth resolves, so the
 * channel never needs to re-subscribe when the card loads asynchronously.
 */
export function useRoomChannel(roomId, gameId, userId) {
  const [roomPatch, setRoomPatch] = useState(null)
  const [cardPatch, setCardPatch] = useState(null)
  const [leaderboardCards, setLeaderboardCards] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [statEvents, setStatEvents] = useState([])
  const [participantJoined, setParticipantJoined] = useState(0)

  const statBufferRef = useRef([])
  const statFlushTimerRef = useRef(null)
  const chatInitializedRef = useRef(false)
  const userIdRef = useRef(userId)
  userIdRef.current = userId

  const flushStatBuffer = useCallback(() => {
    statFlushTimerRef.current = null
    setStatEvents((prev) => {
      const next = [...prev]
      for (const ev of statBufferRef.current) {
        if (!next.find((e) => e.id === ev.id)) next.unshift(ev)
      }
      statBufferRef.current = []
      return next
    })
  }, [])

  const appendChatMessage = useCallback((msg) => {
    setChatMessages((prev) => {
      const next = [...prev, msg]
      return next.length > MAX_CHAT ? next.slice(-MAX_CHAT) : next
    })
  }, [])

  const initChatMessages = useCallback((msgs) => {
    if (chatInitializedRef.current) return
    chatInitializedRef.current = true
    setChatMessages(msgs)
  }, [])

  const resetStatEvents = useCallback((evts) => {
    setStatEvents(evts)
  }, [])

  useEffect(() => {
    if (!roomId) return

    const channel = supabase
      .channel(`room-all:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => setRoomPatch(payload.new)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new
          if (!row?.user_id) return
          const currentUserId = userIdRef.current
          if (currentUserId && row.user_id === currentUserId) {
            setCardPatch(row)
          }
          setLeaderboardCards((prev) => {
            const idx = prev.findIndex((c) => c.user_id === row.user_id)
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = row
              return next
            }
            return [...prev, row]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.new?.id) appendChatMessage(payload.new)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` },
        () => setParticipantJoined((c) => c + 1)
      )

    if (gameId) {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stat_events', filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (!payload.new?.id) return
          statBufferRef.current.push(payload.new)
          if (!statFlushTimerRef.current) {
            statFlushTimerRef.current = setTimeout(flushStatBuffer, STAT_BATCH_MS)
          }
        }
      )
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (statFlushTimerRef.current) {
        clearTimeout(statFlushTimerRef.current)
        statFlushTimerRef.current = null
      }
      chatInitializedRef.current = false
    }
  }, [roomId, gameId, flushStatBuffer, appendChatMessage])

  return {
    roomPatch,
    cardPatch,
    leaderboardCards,
    chatMessages,
    statEvents,
    participantJoined,
    initChatMessages,
    resetStatEvents,
  }
}
