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

export function SignupPage({ onSwitch, onLogin }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (password !== confirm) { setError("Passwords don't match"); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Registration failed'); return }
      const login = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(r => r.json())
      const me: User = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${login.access_token}` },
      }).then(r => r.json())
      onLogin(login.access_token, me)
    } catch {
      setError('Network error — is the server running?')
    } finally { setLoading(false) }
  }

  const ready = !!(name && email && password && confirm && !loading)

  return (
    <>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: ta.accentSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ta.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: ta.text, marginBottom: 4 }}>Create an account</h2>
      <p style={{ fontSize: 13.5, color: ta.textSub, marginBottom: 28, lineHeight: 1.6 }}>Start exploring your codebases with Reposage</p>
      <AuthError msg={error} />
      <AuthInput label="Name" value={name} onChange={setName} placeholder="Ada Lovelace" />
      <AuthInput label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <AuthInput label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
      <AuthInput label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
      <button onClick={submit} disabled={!ready}
        style={{ width: '100%', padding: '10px 0', marginTop: 4, background: ready ? ta.accent : ta.border, color: '#fff', border: 'none', borderRadius: ta.radius, fontSize: 14, fontWeight: 600, cursor: ready ? 'pointer' : 'default', marginBottom: 20 }}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>
      <p style={{ textAlign: 'center', fontSize: 13.5, color: ta.textSub }}>
        Already have an account?{' '}
        <span onClick={onSwitch} style={{ color: ta.accent, cursor: 'pointer', fontWeight: 500 }}>Sign in</span>
      </p>
    </>
  )
}
