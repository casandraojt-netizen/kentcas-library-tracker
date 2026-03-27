import React from 'react'
import { getShelfLabel, getStatusInfo } from '../constants'

function formatTimestamp(value) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ReadingHistoryView({
  history,
  loading,
  error,
  page,
  onPageChange,
  filters,
  onFiltersChange,
  onAuthorClick,
  shelves,
  genres,
}) {
  const toggleEventType = (eventType) => {
    const exists = filters.eventTypes.includes(eventType)
    const next = exists
      ? filters.eventTypes.filter(item => item !== eventType)
      : [...filters.eventTypes, eventType]
    onFiltersChange({ ...filters, eventTypes: next })
  }

  const filterInputStyle = {
    background: 'var(--bg-overlay)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif',
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Reading History</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
          Chapter progress and status changes across your library
        </p>
        {history.truncatedToRecent && (
          <div className="mt-3 rounded-lg px-4 py-3"
            style={{ background: 'rgba(201,135,58,0.08)', border: '1px solid rgba(201,135,58,0.25)', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>
            Showing only the past 30 days because this filtered view exceeds five pages. Turn on “Show full history” to see everything.
          </div>
        )}
      </div>

      <div className="p-6 space-y-5">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <input
            value={filters.search}
            onChange={event => onFiltersChange({ ...filters, search: event.target.value })}
            placeholder="Search title or author..."
            style={filterInputStyle}
          />
          <select
            value={filters.shelf}
            onChange={event => onFiltersChange({ ...filters, shelf: event.target.value })}
            style={filterInputStyle}
          >
            <option value="">All shelves</option>
            {shelves.map(shelf => <option key={shelf.id} value={shelf.id}>{shelf.name}</option>)}
          </select>
          <select
            value={filters.genre}
            onChange={event => onFiltersChange({ ...filters, genre: event.target.value })}
            style={filterInputStyle}
          >
            <option value="">All genres</option>
            {genres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
          </select>
          <input
            value={filters.tag}
            onChange={event => onFiltersChange({ ...filters, tag: event.target.value })}
            placeholder="Filter by tag..."
            style={filterInputStyle}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            ['created', 'Added'],
            ['status_changed', 'Status'],
            ['chapter_progress', 'Chapter'],
          ].map(([value, label]) => {
            const active = filters.eventTypes.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleEventType(value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '999px',
                  border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                  background: active ? 'rgba(201,135,58,0.14)' : 'var(--bg-overlay)',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                }}
              >
                {label}
              </button>
            )
          })}
          <label className="flex items-center gap-2 ml-auto" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={filters.showAll}
              onChange={event => onFiltersChange({ ...filters, showAll: event.target.checked })}
            />
            Show full history
          </label>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="rounded-xl" style={{ height: '78px', background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: 0.5 }} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(154,64,64,0.1)', border: '1px solid rgba(154,64,64,0.3)', color: '#f0a0a0', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
            {error}
          </div>
        ) : history.entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="font-display text-lg" style={{ color: 'var(--text-muted)' }}>No history yet</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
              Chapter updates and status changes will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {history.entries.map(entry => {
                const fromStatus = entry.from_status ? getStatusInfo(entry.from_status) : null
                const toStatus = entry.to_status ? getStatusInfo(entry.to_status) : null
                const eventLabel = entry.event_type === 'chapter_progress'
                  ? `Chapter ${entry.from_chapter || 'start'} -> ${entry.to_chapter || 'unknown'}`
                  : entry.event_type === 'created'
                    ? 'Added to library'
                    : 'Status changed'
                return (
                  <div key={entry.id} className="rounded-xl px-4 py-3 flex items-start gap-4"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="w-10 h-14 overflow-hidden rounded-md flex-shrink-0" style={{ background: 'var(--bg-overlay)' }}>
                      {entry.cover_url ? <img src={entry.cover_url} alt={entry.title} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-lg truncate" style={{ color: 'var(--text-primary)' }}>{entry.title}</p>
                          {entry.author && (
                            onAuthorClick ? (
                              <button
                                type="button"
                                onClick={() => onAuthorClick(entry.author)}
                                className="truncate"
                                style={{ border: 'none', background: 'transparent', color: 'var(--accent)', padding: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer' }}
                              >
                                {entry.author}
                              </button>
                            ) : (
                              <p className="truncate" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>{entry.author}</p>
                            )
                          )}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {formatTimestamp(entry.event_at)}
                        </p>
                      </div>

                      <p style={{ marginTop: '6px', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
                        {eventLabel}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-2" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px' }}>
                        {entry.event_type === 'status_changed' && fromStatus && toStatus && (
                          <>
                            <span style={{ padding: '2px 8px', borderRadius: '999px', background: `${fromStatus.color}22`, color: fromStatus.color, border: `1px solid ${fromStatus.color}44` }}>
                              {fromStatus.label}
                            </span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5l6 7.5-6 7.5M19.5 12h-15" />
                            </svg>
                            <span style={{ padding: '2px 8px', borderRadius: '999px', background: `${toStatus.color}22`, color: toStatus.color, border: `1px solid ${toStatus.color}44` }}>
                              {toStatus.label}
                            </span>
                          </>
                        )}
                        {entry.event_type === 'chapter_progress' && (
                          <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'rgba(201,135,58,0.12)', color: 'var(--accent)', border: '1px solid rgba(201,135,58,0.25)' }}>
                            {entry.from_chapter || 'start'} {'->'} {entry.to_chapter || 'unknown'}
                          </span>
                        )}
                        {entry.shelves.map(shelf => (
                          <span key={shelf} style={{ padding: '2px 8px', borderRadius: '999px', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            {getShelfLabel(shelf)}
                          </span>
                        ))}
                        {entry.genre && (
                          <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            {entry.genre}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {history.totalPages > 1 && (
              <div className="flex items-center justify-between mt-5">
                <p style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '11px' }}>
                  Page {page} of {history.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', opacity: page <= 1 ? 0.4 : 1 }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= history.totalPages}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', opacity: page >= history.totalPages ? 0.4 : 1 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
