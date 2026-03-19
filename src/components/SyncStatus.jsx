import React, { useState, useEffect } from 'react'

export default function SyncStatus() {
  const [syncState, setSyncState] = useState({ isOnline: false, lastSyncAt: null, status: 'idle' })
  const [hasNeonUrl, setHasNeonUrl] = useState(false)

  useEffect(() => {
    // Only show sync UI if a Neon URL is configured
    window.api.getSettings().then(s => {
      setHasNeonUrl(!!(s?.neonUrl || process?.env?.NEON_DATABASE_URL))
    })
    window.api.getSyncStatus().then(s => setSyncState(prev => ({ ...prev, ...s })))
    const unsub = window.api.onSyncUpdate((event) => {
      if (event.type === 'online') setSyncState(prev => ({ ...prev, isOnline: true, status: 'idle' }))
      else if (event.type === 'offline') setSyncState(prev => ({ ...prev, isOnline: false, status: 'offline' }))
      else if (event.type === 'syncing') setSyncState(prev => ({ ...prev, status: 'syncing' }))
      else if (event.type === 'synced') {
        setHasNeonUrl(true)
        setSyncState(prev => ({ ...prev, isOnline: true, status: 'synced', lastSyncAt: event.at }))
      }
      else if (event.type === 'error') setSyncState(prev => ({ ...prev, status: 'error', errorMsg: event.message }))
    })
    return unsub
  }, [])

  // If no Neon URL is configured, show nothing at all
  if (!hasNeonUrl && syncState.status !== 'synced') return null

  const dot = {
    online: '#5a9a6e', offline: '#9a4040', syncing: 'var(--accent)',
    synced: '#5a9a6e', error: '#d4704a', idle: '#6b5f52'
  }[syncState.status] || '#6b5f52'

  const label = {
    syncing: 'Syncing...', synced: 'Synced', error: 'Sync Error',
    offline: 'Offline', online: 'Online',
    idle: syncState.isOnline ? 'Online' : 'Offline',
  }[syncState.status]

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
        style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{
          background: dot,
          boxShadow: syncState.status === 'syncing' ? `0 0 6px ${dot}` : 'none',
          animation: syncState.status === 'syncing' ? 'pulse 1s infinite' : 'none'
        }} />
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
      </div>
      {syncState.isOnline && (
        <button onClick={() => window.api.triggerSync()} title="Sync now"
          style={{ color: 'var(--text-muted)', padding: '4px' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </div>
  )
}
