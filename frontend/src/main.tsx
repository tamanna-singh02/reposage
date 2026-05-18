import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import type { User } from './types'
import { setToken } from './lib/api'
import { App } from './App'
import { AuthApp } from './components/auth/AuthApp'
import { ShareView } from './components/share/ShareView'

function Root() {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('rs_token'))
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setToken(token)
  }, [token])

  const handleLogin = (tok: string, usr: User) => {
    localStorage.setItem('rs_token', tok)
    setTokenState(tok)
    setToken(tok)
    setUser(usr)
  }

  const handleLogout = () => {
    localStorage.removeItem('rs_token')
    setTokenState(null)
    setToken(null)
    setUser(null)
  }

  if (!token) return <AuthApp onLogin={handleLogin} />
  return <App token={token} user={user} onLogout={handleLogout} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/share/:sessionId" element={<ShareView />} />
        <Route path="*" element={<Root />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
