import { useState } from 'react'
import type { Theme, User } from '../../types'
import { apiFetch } from '../../lib/api'

interface Props {
  t: Theme
  user: User | null
  onLogout: () => void
}

export function SettingsView({ t, user, onLogout }: Props) {
  const [name, setName] = useState(user?.name ?? '')
  const [currPw, setCurrPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [toastErr, setToastErr] = useState('')

  function showToast(msg: string, err = false) {
    if (err) { setToastErr(msg); setTimeout(() => setToastErr(''), 3000) }
    else { setToast(msg); setTimeout(() => setToast(''), 3000) }
  }

  async function saveName() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await apiFetch('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ name: name.trim() }) })
      if (!res.ok) { const d = await res.json(); showToast(d.detail || 'Failed to update name', true); return }
      showToast('Name updated')
    } finally { setSaving(false) }
  }

  async function savePassword() {
    if (newPw !== confirmPw) { showToast("Passwords don't match", true); return }
    if (!newPw) return
    setSaving(true)
    try {
      const res = await apiFetch('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ current_password: currPw, new_password: newPw }) })
      if (!res.ok) { const d = await res.json(); showToast(d.detail || 'Failed to update password', true); return }
      showToast('Password updated')
      setCurrPw(''); setNewPw(''); setConfirmPw('')
    } finally { setSaving(false) }
  }

  async function deleteAccount() {
    if (!confirm('Delete your account? This cannot be undone.')) return
    await apiFetch('/api/auth/me', { method: 'DELETE' })
    onLogout()
  }

  const fieldStyle = { width: '100%', padding: '9px 12px', fontSize: 14, border: `1.5px solid ${t.border}`, borderRadius: t.radius, outline: 'none', background: t.bg, color: t.text, fontFamily: 'inherit' } as const
  const labelStyle = { display: 'block', fontSize: 12.5, fontWeight: 600, color: t.textSub, marginBottom: 6 } as const
  const sectionStyle = { background: t.bg, border: `1px solid ${t.border}`, borderRadius: t.radius + 2, padding: '20px 24px', marginBottom: 16 } as const

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 13.5, color: t.textSub, marginBottom: 24 }}>Manage your account</p>

        {toast && <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: t.radius, color: '#15803d', fontSize: 13, marginBottom: 12 }}>{toast}</div>}
        {toastErr && <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: t.radius, color: '#be123c', fontSize: 13, marginBottom: 12 }}>{toastErr}</div>}

        <div style={sectionStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 16 }}>Profile</div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Email</label>
            <div style={{ ...fieldStyle, color: t.textMuted, background: t.bgAlt }}>{user?.email}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Display name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={fieldStyle}
              onFocus={e => (e.target.style.borderColor = t.accent)}
              onBlur={e => (e.target.style.borderColor = t.border)} />
          </div>
          <button onClick={saveName} disabled={saving || !name.trim()}
            style={{ padding: '8px 20px', background: t.accent, color: '#fff', border: 'none', borderRadius: t.radius, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save name'}
          </button>
        </div>

        <div style={sectionStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 16 }}>Change password</div>
          {([['Current password', currPw, setCurrPw], ['New password', newPw, setNewPw], ['Confirm new password', confirmPw, setConfirmPw]] as const).map(([lbl, val, set]) => (
            <div key={lbl} style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{lbl}</label>
              <input type="password" value={val} onChange={e => set(e.target.value)} style={fieldStyle}
                onFocus={e => (e.target.style.borderColor = t.accent)}
                onBlur={e => (e.target.style.borderColor = t.border)} />
            </div>
          ))}
          <button onClick={savePassword} disabled={saving || !currPw || !newPw || !confirmPw}
            style={{ padding: '8px 20px', background: t.accent, color: '#fff', border: 'none', borderRadius: t.radius, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </div>

        <div style={{ ...sectionStyle, borderColor: '#fecdd3' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#be123c', marginBottom: 8 }}>Danger zone</div>
          <p style={{ fontSize: 13, color: t.textSub, marginBottom: 14 }}>Permanently delete your account and all saved data.</p>
          <button onClick={deleteAccount}
            style={{ padding: '8px 20px', background: '#e11d48', color: '#fff', border: 'none', borderRadius: t.radius, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            Delete account
          </button>
        </div>
      </div>
    </div>
  )
}
