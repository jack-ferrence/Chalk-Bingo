import { Routes, Route, Link, useMatch } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.jsx'
import { supabase } from './lib/supabase'
import LobbyPage from './pages/LobbyPage.jsx'
import GameBrowserPage from './pages/GameBrowserPage.jsx'
import GamePage from './pages/GamePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ProtectedRoute from './pages/ProtectedRoute.jsx'

function App() {
  const { user, loading } = useAuth()
  const isGameRoute = useMatch('/room/:roomId')

  if (isGameRoute) {
    return (
      <div className="h-screen bg-bg-primary text-text-primary flex flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-secondary px-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            <span className="text-accent-green">sports</span>
            <span className="text-text-primary">-bingo</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {loading ? (
              <span className="text-text-muted">Loading...</span>
            ) : user ? (
              <span className="text-text-secondary">Playing as guest</span>
            ) : null}
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/room/:roomId" element={<GamePage />} />
          </Routes>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <header className="border-b border-border-subtle bg-bg-secondary">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            <span className="text-accent-green">sports</span>
            <span className="text-text-primary">-bingo</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {loading ? (
              <span className="text-text-muted text-sm">Loading...</span>
            ) : user ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-text-secondary">
                  {user.is_anonymous ? `Guest_${user.id.slice(0, 8)}` : user.email}
                </span>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="text-text-muted hover:text-text-primary transition"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <Link to="/login" className="text-text-secondary hover:text-text-primary transition">Log in</Link>
                <Link to="/register" className="rounded bg-accent-green px-3 py-1 text-bg-primary font-medium hover:opacity-90 transition">Sign up</Link>
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
            <Route path="*" element={<div className="p-8 text-center text-text-secondary">Page not found</div>} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
