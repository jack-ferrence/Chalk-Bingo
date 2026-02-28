import { Routes, Route, Link, useMatch } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.jsx'
import LobbyPage from './pages/LobbyPage.jsx'
import GameBrowserPage from './pages/GameBrowserPage.jsx'
import GamePage from './pages/GamePage.jsx'

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
              <span className="text-text-muted">Loading...</span>
            ) : user ? (
              <span className="text-text-secondary">Playing as guest</span>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Routes>
            <Route path="/" element={<LobbyPage />} />
            <Route path="/games" element={<GameBrowserPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
