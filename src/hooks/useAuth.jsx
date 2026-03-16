import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    // Prevent onAuthStateChange from advancing state while init() is still
    // running. signInAnonymously() triggers the listener mid-init, so init()
    // owns the first loading -> false transition to avoid duplicate state
    // updates during boot.
    let initializing = true

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
      if (!isMounted) return
      initializing = false
      setSession(session)
      setLoading(false)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Skip events that fire during init() — the anonymous sign-in above
      // triggers this callback before init() finishes.
      if (initializing) return
      setSession(newSession)
      setLoading(false)
    })

    init()

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

