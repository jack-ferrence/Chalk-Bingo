import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { THEMES, DEFAULT_THEME } from '../lib/themes'
import { useAuth } from '../hooks/useAuth.jsx'

const ThemeContext = createContext(null)

function applyTheme(themeKey) {
  const theme = THEMES[themeKey] ?? THEMES[DEFAULT_THEME]
  const attr = theme.dataTheme
  if (attr) {
    document.documentElement.setAttribute('data-theme', attr)
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
  document.documentElement.classList.toggle('dark', !!theme.dark)
}

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [userTheme, setUserTheme] = useState(() => {
    try { return localStorage.getItem('ch-theme') || DEFAULT_THEME } catch { return DEFAULT_THEME }
  })
  const [roomTheme, setRoomTheme] = useState(null)
  const roomIdRef = useRef(null)

  // Priority: room theme > user theme > default
  const activeTheme = (roomTheme && THEMES[roomTheme]) ? roomTheme : userTheme

  useEffect(() => {
    applyTheme(activeTheme)
  }, [activeTheme])

  // Persist user theme to localStorage + Supabase profile
  const setTheme = useCallback(async (key) => {
    if (!THEMES[key]) return
    setUserTheme(key)
    try { localStorage.setItem('ch-theme', key) } catch { /* noop */ }
    if (user?.id) {
      await supabase.from('profiles').update({ user_theme: key }).eq('id', user.id)
    }
  }, [user?.id])

  // Load user theme from profile on login
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_theme')
        .eq('id', user.id)
        .single()
      if (!cancelled && data?.user_theme && THEMES[data.user_theme]) {
        setUserTheme(data.user_theme)
        try { localStorage.setItem('ch-theme', data.user_theme) } catch { /* noop */ }
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  // Enter/leave a room — subscribe to room_theme changes in real time
  const enterRoom = useCallback((roomId, initialRoomTheme) => {
    roomIdRef.current = roomId
    setRoomTheme(initialRoomTheme || null)
  }, [])

  const leaveRoom = useCallback(() => {
    roomIdRef.current = null
    setRoomTheme(null)
  }, [])

  useEffect(() => {
    const rid = roomIdRef.current
    if (!rid) return

    const channel = supabase
      .channel(`room-theme-${rid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${rid}` },
        (payload) => {
          const newTheme = payload.new?.room_theme ?? null
          if (roomIdRef.current === rid) {
            setRoomTheme(newTheme)
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomTheme, activeTheme])
  // Re-subscribe when roomIdRef.current changes — tracked by enterRoom/leaveRoom
  // which causes a re-render via setRoomTheme.

  return (
    <ThemeContext.Provider
      value={{ activeTheme, userTheme, roomTheme, setTheme, enterRoom, leaveRoom }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
