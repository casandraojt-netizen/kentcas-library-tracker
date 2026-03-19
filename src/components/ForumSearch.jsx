import React, { useState } from 'react'

const SITES = [
  { id: 'royalroad', label: 'Royal Road', color: '#4a90d9', short: 'RR' },
  { id: 'spacebattles', label: 'SpaceBattles', color: '#d97c4a', short: 'SB' },
  { id: 'sufficientvelocity', label: 'Sufficient Velocity', color: '#7c4ad9', short: 'SV' },
  { id: 'questionablequesting', label: 'Questionable Questing', color: '#4ad97c', short: 'QQ' },
]

function SiteBadge({ siteId }) {
  const site = SITES.find(s => s.id === siteId)
  if (!site) return null
  return (
    <span style={{ fontSize: '9px', fontFamily: 'DM Sans, sans-serif', fontWeight: '600', padding: '2px 6px', borderRadius: '4px', background: site.color + '22', color: site.color, border: `1px solid ${site.color}44`, letterSpacing: '0.04em', flexShrink: 0 }}>
      {site.short}
    </span>
  )
}

export default function ForumSearch({ onClose, onAdd }) {
  const [query, setQuery] = useState('')
  const [selectedSites, setSelectedSites] = useState(['royalroad', 'spacebattles', 'sufficientvelocity', 'questionablequesting'])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(new Set())
  const [expandedDesc, setExpandedDesc] = useState(null)

  const toggleSite = (id) => {
    setSelectedSites(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const search = async () => {
    if (!query.trim() || !selectedSites.length) return
    setLoading(true); setError(''); setResults([])
    try {
      const result = await window.api.searchForums(query.trim(), selectedSites)
      if (result.success) {
        setResults(result.results)
        if (result.results.length === 0) setError('No results found. Try different keywords or check your internet connection.')
      } else {
        setError(result.error || 'Search failed')
      }
    } catch (e) {
      setError('Search failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (item) => {
    await onAdd({
      ...item,
      status: 'unread',
      is_favorite: false,
      is_r18: false,
      current_chapter: '',
      notes: '',
    })
    setAdded(prev => new Set([...prev, item.source_url]))
  }

  const handleKey = (e) => { if (e.key === 'Enter') search() }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)' }}
      onClick={onClose}>
      <div className="w-full max-w-2xl flex flex-col rounded-xl fade-in"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Search Forums</h2>
            <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '4px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Site toggles */}
          <div className="flex gap-2 flex-wrap mb-3">
            {SITES.map(site => (
              <button key={site.id} onClick={() => toggleSite(site.id)}
                style={{
                  padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
                  background: selectedSites.includes(site.id) ? site.color + '22' : 'var(--bg-overlay)',
                  color: selectedSites.includes(site.id) ? site.color : 'var(--text-muted)',
                  border: `1px solid ${selectedSites.includes(site.id) ? site.color + '66' : 'var(--border)'}`,
                  transition: 'all 0.12s',
                }}>
                {site.label}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="flex gap-2">
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
              placeholder="Search by story title or author..."
              className="flex-1"
              style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            <button onClick={search} disabled={loading || !selectedSites.length}
              style={{ background: 'var(--accent)', color: '#0a0908', borderRadius: '6px', padding: '8px 18px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: '500', opacity: loading || !selectedSites.length ? 0.6 : 1, whiteSpace: 'nowrap' }}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                Searching {selectedSites.length} {selectedSites.length === 1 ? 'site' : 'sites'}...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="p-5">
              <div className="rounded-lg p-4" style={{ background: 'rgba(154,64,64,0.08)', border: '1px solid rgba(154,64,64,0.25)' }}>
                <p style={{ fontSize: '13px', color: '#f0a0a0', fontFamily: 'DM Sans, sans-serif' }}>{error}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', marginTop: '6px' }}>
                  Note: Forum scraping may be blocked by some sites. Royal Road search is most reliable.
                </p>
              </div>
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-10 h-10" style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>Search across Royal Road, SpaceBattles, SV, and QQ</p>
            </div>
          )}

          {!loading && results.map((item, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--border)', padding: '14px 20px' }}>
              <div className="flex gap-3">
                {/* Cover */}
                {item.cover_url && (
                  <div className="flex-shrink-0 w-12 h-16 rounded overflow-hidden" style={{ background: 'var(--bg-overlay)' }}>
                    <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" onError={e => e.target.parentElement.style.display = 'none'} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <SiteBadge siteId={item.site} />
                    <h3 className="font-display font-semibold leading-tight flex-1" style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{item.title}</h3>
                  </div>
                  {item.author && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', marginBottom: '4px' }}>by {item.author}</p>}
                  <div className="flex items-center gap-3 mb-2">
                    {item.total_chapters && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>{item.total_chapters} chapters</span>}
                    {item.rating && <span style={{ fontSize: '11px', color: '#f0c040', fontFamily: 'DM Sans, sans-serif' }}>★ {item.rating}</span>}
                  </div>
                  {item.description && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.5' }}>
                      {expandedDesc === i ? item.description : item.description.slice(0, 150)}
                      {item.description.length > 150 && (
                        <button onClick={() => setExpandedDesc(expandedDesc === i ? null : i)}
                          style={{ color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', marginLeft: '4px' }}>
                          {expandedDesc === i ? 'less' : '...more'}
                        </button>
                      )}
                    </p>
                  )}
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {added.has(item.source_url) ? (
                    <span style={{ fontSize: '11px', color: '#5a9a6e', fontFamily: 'DM Sans, sans-serif', padding: '6px 10px' }}>✓ Added</span>
                  ) : (
                    <button onClick={() => handleAdd(item)}
                      style={{ padding: '6px 14px', borderRadius: '6px', background: 'var(--accent)', color: '#0a0908', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      + Add
                    </button>
                  )}
                  <button onClick={() => window.api.openExternal(item.source_url)}
                    style={{ padding: '5px 10px', borderRadius: '6px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    View →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
