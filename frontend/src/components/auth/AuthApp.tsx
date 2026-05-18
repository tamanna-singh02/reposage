import { useState } from 'react'
import type { User } from '../../types'
import { LoginPage } from './LoginPage'
import { SignupPage } from './SignupPage'
import themes from '../../theme/themes'

const ta = themes['notion']

interface Props {
  onLogin: (token: string, user: User) => void
}

export function AuthApp({ onLogin }: Props) {
  const [page, setPage] = useState<'login' | 'signup'>('login')
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ta.bgAlt }}>
      <div style={{ width: 420, background: ta.bg, border: `1px solid ${ta.border}`, borderRadius: ta.radius + 6, padding: '36px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        {page === 'login'
          ? <LoginPage onSwitch={() => setPage('signup')} onLogin={onLogin} />
          : <SignupPage onSwitch={() => setPage('login')} onLogin={onLogin} />
        }
      </div>
    </div>
  )
}
