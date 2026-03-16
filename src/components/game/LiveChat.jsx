import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Panel from '../ui/Panel.jsx'

const MAX_CHAT = 100
const MAX_CHARS = 280
const RATE_LIMIT_MS = 2000
const SCROLL_THROTTLE_MS = 200

const USER_COLORS = [
  'text-accent-purple',
  'text-accent-gold',
  'text-accent-green',
  'text-accent-red',
  'text-sky-400',
  'text-pink-400',
  'text-orange-400',
  'text-teal-400',
]

function userColor(userId) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

const ChatMessage = memo(function ChatMessage({ msg, isNew }) {
  return (
    <div className={`px-1 text-xs leading-relaxed break-words ${isNew ? 'chat-msg-in' : ''}`}>
      <span className={`font-semibold ${userColor(msg.user_id)}`}>
        {msg.username}
      </span>
      <span className="text-text-muted">: </span>
      <span className="text-text-secondary">{msg.message}</span>
    </div>
  )
})

function LiveChat({ roomId, userId, username, realtimeMessages, initChatMessages }) {
  const [localMessages, setLocalMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [slowDown, setSlowDown] = useState(false)
  const lastSentRef = useRef(0)
  const listRef = useRef(null)
  const isNearBottomRef = useRef(true)
  const [animatedIds] = useState(() => new Set())
  const scrollThrottleRef = useRef(null)
  const initialLoadRef = useRef(false)

  const throttledScrollToBottom = useCallback(() => {
    if (scrollThrottleRef.current) return
    scrollThrottleRef.current = setTimeout(() => {
      scrollThrottleRef.current = null
      const el = listRef.current
      if (el) el.scrollTop = el.scrollHeight
    }, SCROLL_THROTTLE_MS)
  }, [])

  const checkNearBottom = useCallback(() => {
    const el = listRef.current
    if (!el) return
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }, [])

  // Initial fetch
  useEffect(() => {
    if (!roomId || initialLoadRef.current) return
    initialLoadRef.current = true

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(MAX_CHAT)
      const msgs = data ?? []
      setLocalMessages(msgs)
      if (initChatMessages) initChatMessages(msgs)
      requestAnimationFrame(() => {
        const el = listRef.current
        if (el) el.scrollTop = el.scrollHeight
      })
    }

    fetchMessages()
  }, [roomId, initChatMessages])

  // Merge realtime messages from the consolidated channel
  useEffect(() => {
    if (!realtimeMessages || realtimeMessages.length === 0) return

    setLocalMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id))
      const newMsgs = realtimeMessages.filter((m) => !existingIds.has(m.id))
      if (newMsgs.length === 0) return prev

      for (const m of newMsgs) animatedIds.add(m.id)

      const next = [...prev, ...newMsgs]
      if (isNearBottomRef.current) throttledScrollToBottom()
      return next.length > MAX_CHAT ? next.slice(-MAX_CHAT) : next
    })
  }, [realtimeMessages, throttledScrollToBottom, animatedIds])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || !roomId || !userId || sending) return

    const now = Date.now()
    if (now - lastSentRef.current < RATE_LIMIT_MS) {
      setSlowDown(true)
      setTimeout(() => setSlowDown(false), 1500)
      return
    }

    setSending(true)
    lastSentRef.current = now

    await supabase.from('chat_messages').insert({
      room_id: roomId,
      user_id: userId,
      username: username || 'Guest',
      message: text,
    })

    setInput('')
    setSending(false)
  }, [input, roomId, userId, username, sending])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  if (!roomId) return null

  return (
    <Panel title="Chat" className="flex flex-col">
      <div
        ref={listRef}
        onScroll={checkNearBottom}
        className="flex-1 overflow-y-auto scrollbar-thin"
        style={{ maxHeight: '12rem' }}
        aria-live="polite"
      >
        {localMessages.length === 0 ? (
          <p className="py-4 text-center text-xs text-text-muted">
            No messages yet. Say hi!
          </p>
        ) : (
          <div className="space-y-0.5 py-1">
            {localMessages.map((msg) => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                isNew={animatedIds.has(msg.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 border-t border-border-subtle pt-2">
        {slowDown && (
          <p className="mb-1 text-[10px] font-medium text-accent-red animate-in-from-top">
            Slow down — 1 message every 2 seconds.
          </p>
        )}

        <div className="flex gap-1.5">
          <label htmlFor="chat-input" className="sr-only">
            Chat message
          </label>
          <input
            id="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder="Send a message..."
            className="min-w-0 flex-1 rounded-md border border-border-subtle bg-bg-card px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-purple focus:outline-none focus:ring-1 focus:ring-accent-purple disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-md bg-accent-purple px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-accent-purple/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>

        {input.length > 200 && (
          <p className="mt-0.5 text-right text-[10px] tabular-nums text-text-muted">
            {input.length}/{MAX_CHARS}
          </p>
        )}
      </div>
    </Panel>
  )
}

export default memo(LiveChat)
