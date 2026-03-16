import { useState } from 'react'
import Navbar from './Navbar.jsx'
import Sidebar from './Sidebar.jsx'

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: '#EDEBE8', color: '#2D2A26' }}
    >
      <Navbar onMenuClick={() => setSidebarOpen(true)} />

      {/* Content area: CSS grid on desktop, single column on mobile */}
      <div className="flex flex-1 overflow-hidden md:grid md:grid-cols-[260px_1fr]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
