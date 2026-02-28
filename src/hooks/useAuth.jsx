import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!isMounted) return
      if (error) {
        console.error('Error getting session', error)
      }
      let session = data?.session ?? null
      // If no session, sign in anonymously so you can test without logging in
      if (!session) {
        const { data: anonData } = await supabase.auth.signInAnonymously()
        if (anonData?.session) session = anonData.session
      }
      if (session?.user?.id && session.user.is_anonymous) {
        await supabase
          .from('profiles')
          .upsert(
            {
              id: session.user.id,
              username: `Guest_${session.user.id.slice(0, 8)}`,
            },
            { onConflict: 'id' }
          )
      }
      setSession(session)
      setLoading(false)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  const { user, session, loading, signOut } = ctx
  return { user, session, loading, signOut }
}

