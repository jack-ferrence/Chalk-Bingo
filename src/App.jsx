import { Routes, Route, Link } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.jsx'
import LobbyPage from './pages/LobbyPage.jsx'
import GamePage from './pages/GamePage.jsx'

function App() {
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            <span className="text-sky-400">sports</span>
            <span className="text-slate-100">-bingo</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {loading ? (
              <span className="text-slate-400">Loading...</span>
            ) : user ? (
              <span className="text-slate-400">Playing as guest</span>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Routes>
            <Route path="/" element={<LobbyPage />} />
            <Route path="/room/:roomId" element={<GamePage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
