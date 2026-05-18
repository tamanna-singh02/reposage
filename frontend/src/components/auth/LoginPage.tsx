import { useState } from 'react'
import type { User } from '../../types'
import { AuthInput } from './AuthInput'
import { AuthError } from './AuthError'
import themes from '../../theme/themes'

const ta = themes['notion']

interface Props {
  onSwitch: () => void
  onLogin: (token: string, user: User) => void
}

export function LoginPage({ onSwitch, onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Login failed'); return }
      const me: User = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      }).then(r => r.json())
      onLogin(data.access_token, me)
    } catch {
      setError('Network error — is the server running?')
    } finally { setLoading(false) }
  }

  return (
    <>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: ta.accentSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ta.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: ta.text, marginBottom: 4 }}>Welcome back</h2>
      <p style={{ fontSize: 13.5, color: ta.textSub, marginBottom: 28, lineHeight: 1.6 }}>Sign in to your Reposage account</p>
      <AuthError msg={error} />
      <AuthInput label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <AuthInput label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
      <button onClick={submit} disabled={loading || !email || !password}
        style={{ width: '100%', padding: '10px 0', marginTop: 4, background: email && password && !loading ? ta.accent : ta.border, color: '#fff', border: 'none', borderRadius: ta.radius, fontSize: 14, fontWeight: 600, cursor: email && password && !loading ? 'pointer' : 'default', marginBottom: 20 }}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <p style={{ textAlign: 'center', fontSize: 13.5, color: ta.textSub }}>
        Don't have an account?{' '}
        <span onClick={onSwitch} style={{ color: ta.accent, cursor: 'pointer', fontWeight: 500 }}>Sign up</span>
      </p>
    </>
  )
}
