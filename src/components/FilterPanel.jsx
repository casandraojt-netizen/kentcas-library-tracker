import React from 'react'
import { getStatuses, getGenres } from '../constants'

export default function FilterPanel({ collection, filters, onChange }) {
  const statuses = getStatuses(collection)
  const genres = getGenres(collection)
  const set = (key, val) => onChange({ ...filters, [key]: val })
  const toggleArr = (key, val) => {
    const arr = filters[key] || []
    onChange({ ...filters, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] })
  }

  const inputStyle = {
    background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-primary)',
    borderRadius: '6px', padding: '6px 10px', fontSize: '12px', width: '100%',
    fontFamily: 'DM Sans, sans-serif', outline: 'none',
  }
  const labelStyle = { fontSize: '10px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px', display: 'block' }
  const chip = (active) => ({
    padding: '4px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap', transition: 'all 0.12s',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'rgba(201,135,58,0.15)' : 'var(--bg-overlay)',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
  })

  const hasFilters = filters.search || filters.favoritesOnly || filters.rssUpdatesOnly || (filters.statuses?.length) || (filters.genres?.length) || filters.yearFrom || filters.yearTo

  return (
    <div className="space-y-5">
      {/* Search */}
      <div>
        <label style={labelStyle}>Search</label>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input style={{ ...inputStyle, paddingLeft: '30px' }} value={filters.search || ''} onChange={e => set('search', e.target.value)} placeholder="Title, author..." />
        </div>
      </div>

      {/* Quick toggles */}
      <div className="flex flex-col gap-2">
        <button onClick={() => set('favoritesOnly', !filters.favoritesOnly)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-left"
          style={{ background: filters.favoritesOnly ? 'rgba(240,192,64,0.12)' : 'var(--bg-overlay)', border: '1px solid ' + (filters.favoritesOnly ? 'rgba(240,192,64,0.4)' : 'var(--border)'), color: filters.favoritesOnly ? '#f0c040' : 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Sans, sans-serif' }}>
          <svg viewBox="0 0 24 24" fill={filters.favoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Favorites Only
        </button>
        {collection === 'web' && (
          <button onClick={() => set('rssUpdatesOnly', !filters.rssUpdatesOnly)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-left"
            style={{ background: filters.rssUpdatesOnly ? 'rgba(90,154,110,0.12)' : 'var(--bg-overlay)', border: '1px solid ' + (filters.rssUpdatesOnly ? 'rgba(90,154,110,0.4)' : 'var(--border)'), color: filters.rssUpdatesOnly ? '#5a9a6e' : 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Sans, sans-serif' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: filters.rssUpdatesOnly ? '#5a9a6e' : 'var(--text-muted)', display: 'inline-block', flexShrink: 0 }} />
            New Updates Only
          </button>
        )}
      </div>

      {/* Status */}
      <div>
        <label style={labelStyle}>Status</label>
        <div className="flex flex-wrap gap-1.5">
          {statuses.map(s => (
            <button key={s.value} onClick={() => toggleArr('statuses', s.value)} style={chip((filters.statuses || []).includes(s.value))}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Genre */}
      <div>
        <label style={labelStyle}>Genre</label>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
          {genres.map(g => (
            <button key={g} onClick={() => toggleArr('genres', g)} style={chip((filters.genres || []).includes(g))}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Year Range */}
      <div>
        <label style={labelStyle}>Year Range</label>
        <div className="flex gap-2 items-center">
          <input style={inputStyle} type="number" value={filters.yearFrom || ''} onChange={e => set('yearFrom', e.target.value)} placeholder="From" />
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>–</span>
          <input style={inputStyle} type="number" value={filters.yearTo || ''} onChange={e => set('yearTo', e.target.value)} placeholder="To" />
        </div>
      </div>

      {/* Sort */}
      <div>
        <label style={labelStyle}>Sort By</label>
        <select style={inputStyle} value={filters.sortBy || 'updated_at'} onChange={e => set('sortBy', e.target.value)}>
          <option value="updated_at">Last Updated</option>
          <option value="status_changed_at">Status Changed Date</option>
          <option value="title">Title A–Z</option>
          <option value="year">Year</option>
          <option value="status">Status</option>
        </select>
      </div>

      {/* Clear */}
      {hasFilters && (
        <button onClick={() => onChange({ sortBy: filters.sortBy || 'updated_at' })} className="w-full py-1.5 rounded-lg text-xs"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'DM Sans, sans-serif' }}>
          Clear Filters
        </button>
      )}
    </div>
  )
}
