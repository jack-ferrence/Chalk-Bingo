import { useState } from 'react'
import { Routes, Route, Link, useMatch } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.jsx'
import { supabase } from './lib/supabase'
import LobbyPage from './pages/LobbyPage.jsx'
import GameBrowserPage from './pages/GameBrowserPage.jsx'
import GamePage from './pages/GamePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ProtectedRoute from './pages/ProtectedRoute.jsx'
import ThemePicker from './components/ThemePicker.jsx'

function App() {
  const { user, loading } = useAuth()
  const isGameRoute = useMatch('/room/:roomId')
  const [showThemePicker, setShowThemePicker] = useState(false)

  if (isGameRoute) {
    return (
      <div className="h-screen flex flex-col" style={{ background: 'var(--ch-secondary)' }}>
        <header className="flex h-14 shrink-0 items-center justify-between px-4" style={{ background: 'var(--ch-secondary)', borderBottom: '1px solid rgba(245,166,35,0.1)' }}>
          <Link to="/" className="flex items-center gap-2" style={{ fontFamily: 'var(--ch-font-display)', fontSize: 28, letterSpacing: '0.1em', textDecoration: 'none' }}>
            <span style={{ color: 'var(--ch-primary)' }}>CHALK</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => setShowThemePicker(true)}
              className="transition"
              style={{ color: 'var(--ch-gray-400)' }}
              aria-label="Change theme"
              title="Change theme"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7.003 7.003 0 009.958 7.784.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
              </svg>
            </button>
            {loading ? (
              <span style={{ color: 'var(--ch-gray-500)' }}>Loading...</span>
            ) : user ? (
              <span style={{ color: 'var(--ch-primary)' }}>
                {user.is_anonymous ? `Guest_${user.id.slice(0, 8)}` : user.email}
              </span>
            ) : null}
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/room/:roomId" element={<GamePage />} />
          </Routes>
        </main>

        {showThemePicker && <ThemePicker onClose={() => setShowThemePicker(false)} />}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ch-secondary)', color: 'var(--ch-white)' }}>
      <header style={{ background: 'var(--ch-secondary)', borderBottom: '1px solid rgba(245,166,35,0.1)' }}>
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2" style={{ fontFamily: 'var(--ch-font-display)', fontSize: 28, letterSpacing: '0.1em', textDecoration: 'none' }}>
            <span style={{ color: 'var(--ch-primary)' }}>CHALK</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => setShowThemePicker(true)}
              className="transition hover:opacity-80"
              style={{ color: 'var(--ch-gray-400)' }}
              aria-label="Change theme"
              title="Change theme"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7.003 7.003 0 009.958 7.784.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
              </svg>
            </button>
            {loading ? (
              <span style={{ color: 'var(--ch-gray-500)' }}>Loading...</span>
            ) : user ? (
              <div className="flex items-center gap-3 text-sm">
                <span style={{ color: 'var(--ch-primary)', fontWeight: 600 }}>
                  {user.is_anonymous ? `Guest_${user.id.slice(0, 8)}` : user.email}
                </span>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="transition hover:opacity-80"
                  style={{ color: 'var(--ch-gray-400)' }}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <Link to="/login" className="transition hover:opacity-80" style={{ color: 'var(--ch-gray-400)' }}>Log in</Link>
                <Link to="/register" className="rounded px-3 py-1 font-medium transition hover:opacity-90" style={{ background: 'var(--ch-gradient-primary)', color: 'var(--ch-secondary)' }}>Sign up</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<LobbyPage />} />
              <Route path="/games" element={<GameBrowserPage />} />
            </Route>
            <Route path="*" element={<div className="p-8 text-center" style={{ color: 'var(--ch-gray-400)' }}>Page not found</div>} />
          </Routes>
        </div>
      </main>

      {showThemePicker && <ThemePicker onClose={() => setShowThemePicker(false)} />}
    </div>
  )
}

export default App
