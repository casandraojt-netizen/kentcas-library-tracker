import React, { useState, useEffect } from 'react'

export default function SettingsModal({ onClose }) {
  const [neonUrl, setNeonUrl] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.getSettings().then(s => { if (s.neonUrl) setNeonUrl(s.neonUrl) })
  }, [])

  const handleSave = async () => {
    await window.api.saveSettings({ neonUrl })
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1200)
  }

  const inputStyle = {
    background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-primary)',
    borderRadius: '6px', padding: '8px 12px', fontSize: '13px', width: '100%',
    fontFamily: 'DM Sans, sans-serif', outline: 'none',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-xl fade-in p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }} onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Settings</h2>
        <p className="mb-5" style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>Configure your Neon PostgreSQL connection for cloud sync.</p>

        <div className="space-y-4">
          <div>
            <label style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px', display: 'block' }}>
              Neon Database URL
            </label>
            <input style={inputStyle} type="password" value={neonUrl} onChange={e => setNeonUrl(e.target.value)} placeholder="postgresql://user:pass@host/dbname?sslmode=require"
              onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', marginTop: '6px' }}>
              Found in your Neon dashboard → Connection Details → Connection string
            </p>
          </div>
          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(201,135,58,0.06)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.5' }}>
              💡 You can also set <code style={{ background: 'var(--bg-overlay)', padding: '1px 4px', borderRadius: '3px', fontSize: '11px' }}>NEON_DATABASE_URL</code> in a <code style={{ background: 'var(--bg-overlay)', padding: '1px 4px', borderRadius: '3px', fontSize: '11px' }}>.env</code> file in the app directory.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)', background: 'var(--bg-overlay)', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
          <button onClick={handleSave} className="px-5 py-2 rounded-lg text-sm font-medium" style={{ background: saved ? '#5a9a6e' : 'var(--accent)', color: '#0a0908', fontFamily: 'DM Sans, sans-serif' }}>
            {saved ? '✓ Saved!' : 'Save & Reconnect'}
          </button>
        </div>
      </div>
    </div>
  )
}
