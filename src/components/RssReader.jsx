import React, { useState, useEffect } from 'react'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const mins = Math.floor(diff / 60000)
  if (days > 60) return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

function formatWords(w) {
  if (!w) return null
  const n = parseInt(w)
  if (isNaN(n)) return null
  return n >= 1000 ? `${(n/1000).toFixed(0)}k words` : `${n} words`
}

export default function RssReader({ book, onClose, onClearUpdate }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeItem, setActiveItem] = useState(null)

  useEffect(() => {
    if (!book.rss_feed_url) { setLoading(false); setError('No RSS feed URL set for this book.'); return }
    // Small delay prevents React Strict Mode double-invoke from racing
    const timer = setTimeout(loadFeed, 80)
    return () => clearTimeout(timer)
  }, [book.id])

  const loadFeed = async () => {
    setLoading(true); setError('')
    try {
      const result = await window.api.fetchRss(book.rss_feed_url)
      if (result.success) {
        setItems(result.items || [])
        if (result.notModified) setError('Feed returned no new content (304).')
      } else {
        setError(result.error || 'Failed to load feed')
      }
    } catch (e) {
      setError('Failed to load feed: ' + e.message)
    } finally {
      setLoading(false) }
  }

  const openExternal = (url) => window.api.openExternal(url)

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="ml-auto h-full flex fade-in" style={{ width: activeItem ? '100%' : '480px', maxWidth: '100%' }}
        onClick={e => e.stopPropagation()}>

        {/* Chapter list */}
        <div className="flex flex-col h-full flex-shrink-0" style={{ width: '480px', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}>
          {/* Header */}
          <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 19.5v-.75a7.5 7.5 0 00-7.5-7.5H4.5m0-6.75h.75c7.87 0 14.25 6.38 14.25 14.25v.75M6 18.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                  <span style={{ fontSize: '10px', color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.07em' }}>RSS Feed</span>
                  {items.length > 0 && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                      {items.length} chapters
                    </span>
                  )}
                </div>
                <h2 className="font-display text-lg font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{book.title}</h2>
                {book.author && <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>{book.author}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={loadFeed} title="Refresh"
                  style={{ color: 'var(--text-muted)', padding: '6px' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                {book.source_url && (
                  <button onClick={() => openExternal(book.source_url)} title="Open story page"
                    style={{ color: 'var(--text-muted)', padding: '6px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </button>
                )}
                <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '6px' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>Loading feed...</p>
              </div>
            )}
            {error && !loading && (
              <div className="p-5">
                <div className="rounded-lg p-4" style={{ background: 'rgba(154,64,64,0.1)', border: '1px solid rgba(154,64,64,0.3)' }}>
                  <p style={{ fontSize: '13px', color: '#f0a0a0', fontFamily: 'DM Sans, sans-serif' }}>{error}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', marginTop: '6px' }}>
                    Make sure the RSS URL points to the threadmarks feed, e.g.:<br/>
                    <code style={{ fontSize: '10px', opacity: 0.8 }}>.../threadmarks.rss?threadmark_category=1</code>
                  </p>
                </div>
              </div>
            )}
            {!loading && !error && items.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>No chapters found in feed</p>
              </div>
            )}
            {!loading && items.map((item, i) => (
              <button key={i} onClick={() => setActiveItem(item)}
                className="w-full text-left px-5 py-3.5 transition-colors"
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: activeItem?.link === item.link ? 'rgba(201,135,58,0.08)' : 'transparent',
                  borderLeft: activeItem?.link === item.link ? '2px solid var(--accent)' : '2px solid transparent',
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                }}
                onMouseEnter={e => { if (activeItem?.link !== item.link) e.currentTarget.style.background = 'var(--bg-overlay)' }}
                onMouseLeave={e => { if (activeItem?.link !== item.link) e.currentTarget.style.background = 'transparent' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {i === 0 && (
                      <span style={{ fontSize: '9px', background: 'rgba(201,135,58,0.2)', color: 'var(--accent)', padding: '1px 5px', borderRadius: '4px', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.05em', flexShrink: 0 }}>LATEST</span>
                    )}
                    <p className="font-display font-semibold leading-snug truncate"
                      style={{ fontSize: '13px', color: i === 0 ? 'var(--accent-light)' : 'var(--text-primary)' }}>
                      {item.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                      {timeAgo(item.pubDate || item.isoDate)}
                    </span>
                    {formatWords(item.words) && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                        {formatWords(item.words)}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); openExternal(item.link); if (i === 0 && book.rss_has_update) onClearUpdate && onClearUpdate() }}
                  title="Open in browser" className="flex-shrink-0 mt-1"
                  style={{ color: 'var(--text-muted)', padding: '2px' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </button>
              </button>
            ))}
          </div>
        </div>

        {/* Built-in webview reader */}
        {activeItem && (
          <div className="flex-1 flex flex-col h-full" style={{ background: '#fff', borderLeft: '1px solid var(--border)', minWidth: 0 }}>
            <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
              style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => setActiveItem(null)}
                style={{ color: 'var(--text-muted)', padding: '4px', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <p className="flex-1 truncate font-display" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{activeItem.title}</p>
              <button onClick={() => { openExternal(activeItem.link); if (book.rss_has_update) onClearUpdate && onClearUpdate() }}
                className="flex items-center gap-1.5 px-3 py-1 rounded flex-shrink-0"
                style={{ background: 'var(--accent)', color: '#0a0908', fontSize: '11px', fontFamily: 'DM Sans, sans-serif', fontWeight: '500' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Open in Browser
              </button>
            </div>
            <webview
              src={activeItem.link}
              style={{ flex: 1, width: '100%', border: 'none' }}
              allowpopups="true"
              useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
            />
          </div>
        )}
      </div>
    </div>
  )
}
