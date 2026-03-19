import React, { useState, useRef } from 'react'

export default function CoverSearch({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setResults([])
    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,cover_i,first_publish_year&limit=12`)
      const data = await res.json()
      const items = (data.docs || [])
        .filter(d => d.cover_i)
        .map(d => ({
          title: d.title,
          author: d.author_name ? d.author_name[0] : '',
          year: d.first_publish_year,
          cover: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`,
          coverThumb: `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`,
        }))
      setResults(items)
      if (items.length === 0) setError('No results with covers found. Try a different search.')
    } catch {
      setError('Search failed. Check your internet connection.')
    } finally { setLoading(false) }
  }

  const handleKey = (e) => { if (e.key === 'Enter') search() }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl fade-in flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}>

        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>Search Cover Image</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-5 py-3 flex gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <input ref={inputRef} autoFocus value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
            placeholder="Search by title or author..."
            className="flex-1" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <button onClick={search} disabled={loading}
            style={{ background: 'var(--accent)', color: '#0a0908', borderRadius: '6px', padding: '8px 16px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: '500', opacity: loading ? 0.6 : 1 }}>
            {loading ? '...' : 'Search'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && <p style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>{error}</p>}
          {loading && (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ aspectRatio: '2/3', background: 'var(--bg-card)', borderRadius: '6px', opacity: 0.4, animation: 'shimmer 1.5s infinite' }} />
              ))}
            </div>
          )}
          {!loading && results.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {results.map((r, i) => (
                <button key={i} onClick={() => { onSelect(r.cover, r.title, r.author, r.year); onClose() }}
                  className="text-left rounded-lg overflow-hidden group transition-all"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.border = '1px solid var(--border-strong)'; e.currentTarget.style.transform = 'scale(1.02)' }}
                  onMouseLeave={e => { e.currentTarget.style.border = '1px solid var(--border)'; e.currentTarget.style.transform = 'scale(1)' }}>
                  <div style={{ aspectRatio: '2/3', overflow: 'hidden', background: 'var(--bg-overlay)' }}>
                    <img src={r.coverThumb} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  </div>
                  <div className="p-2">
                    <p className="truncate font-display" style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: '600' }}>{r.title}</p>
                    {r.author && <p className="truncate" style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>{r.author}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {!loading && results.length === 0 && !error && (
            <p style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>
              Search for a book title to find cover images from Open Library
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
