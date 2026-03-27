import React, { useState } from 'react'
import { getCollectionLabel } from '../constants'

export default function ShelfModal({ existingShelves, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [collection, setCollection] = useState('physical')
  const [error, setError] = useState('')

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Shelf name is required.')
      return
    }
    const duplicate = existingShelves.some(shelf => shelf.name.toLowerCase() === trimmed.toLowerCase() || shelf.id.toLowerCase() === trimmed.toLowerCase())
    if (duplicate) {
      setError('A shelf with that name already exists.')
      return
    }
    onCreate({ name: trimmed, collection })
  }

  const buttonStyle = (active) => ({
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'rgba(201,135,58,0.14)' : 'var(--bg-overlay)',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '13px',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-xl" onClick={event => event.stopPropagation()}
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Create Shelf</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: 0, cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px', display: 'block' }}>
              Shelf Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={event => { setName(event.target.value); setError('') }}
              placeholder='e.g. "To Buy"'
              style={{ width: '100%', background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', padding: '10px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px', display: 'block' }}>
              Shelf Type
            </label>
            <div className="flex gap-2">
              {['physical', 'web'].map(type => (
                <button key={type} type="button" onClick={() => setCollection(type)} style={buttonStyle(collection === type)}>
                  {getCollectionLabel(type)}
                </button>
              ))}
            </div>
            <p style={{ marginTop: '8px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '11px' }}>
              Shelf type controls available statuses, genres, and whether RSS/forum tools are shown.
            </p>
          </div>

          {error && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(154,64,64,0.1)', border: '1px solid rgba(154,64,64,0.3)', color: '#f0a0a0', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
            Cancel
          </button>
          <button onClick={handleCreate} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--accent)', background: 'var(--accent)', color: '#0a0908', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: '600' }}>
            Create Shelf
          </button>
        </div>
      </div>
    </div>
  )
}
