import { Routes, Route, Link, useMatch } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.jsx'
import LobbyPage from './pages/LobbyPage.jsx'
import GameBrowserPage from './pages/GameBrowserPage.jsx'
import GamePage from './pages/GamePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ProtectedRoute from './pages/ProtectedRoute.jsx'
import AppShell from './components/layout/AppShell.jsx'

function App() {
  const { user, loading } = useAuth()
  const isGameRoute = useMatch('/room/:roomId')

  // Game room: full-screen, no sidebar or sport tabs
  if (isGameRoute) {
    return (
      <div className="h-screen flex flex-col" style={{ background: '#0A0E17' }}>
        <header
          className="flex h-14 shrink-0 items-center justify-between px-4"
          style={{ background: '#0A0E17', borderBottom: '1px solid #1E293B' }}
        >
          <Link
            to="/"
            style={{
              fontFamily: 'var(--ch-font-display)',
              fontSize: 24,
              letterSpacing: '0.15em',
              color: '#00E676',
              textDecoration: 'none',
              lineHeight: 1,
            }}
          >
            CHALK
          </Link>
          {!loading && user && (
            <span style={{ color: '#64748B', fontSize: 12 }}>
              {user.is_anonymous ? `Guest_${user.id.slice(0, 8)}` : user.email}
            </span>
          )}
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
    <AppShell>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/games" element={<GameBrowserPage />} />
        </Route>
        <Route
          path="*"
          element={
            <div className="p-8 text-center" style={{ color: '#64748B' }}>
              Page not found
            </div>
          }
        />
      </Routes>
    </AppShell>
  )
}

export default App
