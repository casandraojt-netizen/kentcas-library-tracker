import React, { useState, useMemo, useEffect } from 'react'
import BookCard from './BookCard'
import BookModal from './BookModal'
import FilterPanel from './FilterPanel'

function applyFilters(books, filters) {
  let result = [...books]
  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
  }
  if (filters.favoritesOnly) result = result.filter(b => b.is_favorite)
  if (filters.rssUpdatesOnly) result = result.filter(b => b.rss_has_update)
  if (filters.statuses?.length) result = result.filter(b => filters.statuses.includes(b.status))
  if (filters.genres?.length) result = result.filter(b => filters.genres.includes(b.genre))
  if (filters.yearFrom) result = result.filter(b => b.year >= parseInt(filters.yearFrom))
  if (filters.yearTo) result = result.filter(b => b.year <= parseInt(filters.yearTo))

  const sortBy = filters.sortBy || 'updated_at'
  result.sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title)
    if (sortBy === 'year') return (b.year || 0) - (a.year || 0)
    if (sortBy === 'status') return a.status.localeCompare(b.status)
    if (sortBy === 'status_changed_at') return new Date(b.status_changed_at || 0) - new Date(a.status_changed_at || 0)
    return new Date(b.updated_at) - new Date(a.updated_at)
  })
  return result
}

export default function CollectionView({ collection, books, loading, addBook, updateBook, deleteBook, onImport }) {
  const [modal, setModal] = useState(null)
  const [filters, setFilters] = useState({ sortBy: 'updated_at' })
  const [filterOpen, setFilterOpen] = useState(false)

  const filtered = useMemo(() => applyFilters(books, filters), [books, filters])
  const activeFilterCount = [
    filters.search, filters.favoritesOnly, filters.rssUpdatesOnly,
    ...(filters.statuses || []), ...(filters.genres || []),
    filters.yearFrom, filters.yearTo,
  ].filter(Boolean).length

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
      if (e.key === 'n' || e.key === 'N') setModal({ isNew: true })
      if (e.key === 'f' || e.key === 'F') setFilters(f => ({ ...f, favoritesOnly: !f.favoritesOnly }))
      if (e.key === '/') { setFilterOpen(true); setTimeout(() => document.querySelector('input[placeholder="Title, author..."]')?.focus(), 100) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleSave = async (bookData) => {
    if (bookData.id && books.find(b => b.id === bookData.id)) {
      await updateBook(bookData.id, bookData)
    } else {
      await addBook({ ...bookData, collection })
    }
  }

  const handleIncrementChapter = async (id, newChapter) => {
    await updateBook(id, { current_chapter: newChapter })
  }

  const handleClearRssUpdate = async (id) => {
    await window.api.clearRssUpdate(id)
    await updateBook(id, { rss_has_update: false })
  }

  const rssUpdateCount = books.filter(b => b.rss_has_update).length
  const label = collection === 'physical' ? 'Physical Books' : 'Web Collection'
  const subtitle = collection === 'physical' ? 'Your bookshelf' : 'Novels, manhwa & manga'

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filter Sidebar */}
      <div className="flex-shrink-0 overflow-y-auto transition-all duration-200"
        style={{ width: filterOpen ? '220px' : '0px', opacity: filterOpen ? 1 : 0, padding: filterOpen ? '20px 16px' : '0', borderRight: filterOpen ? '1px solid var(--border)' : 'none', background: 'var(--bg-surface)', overflow: filterOpen ? 'auto' : 'hidden' }}>
        {filterOpen && <FilterPanel collection={collection} filters={filters} onChange={setFilters} />}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</h1>
              {rssUpdateCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-ui"
                  style={{ background: 'rgba(90,154,110,0.15)', color: '#5a9a6e', border: '1px solid rgba(90,154,110,0.3)', fontFamily: 'DM Sans, sans-serif', fontSize: '11px' }}>
                  {rssUpdateCount} new
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
              {subtitle} · {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
              {activeFilterCount > 0 && ` (filtered from ${books.length})`}
              <span style={{ marginLeft: '8px', opacity: 0.5 }}>· Press N to add, / to search, F to toggle favorites</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setFilterOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ background: filterOpen || activeFilterCount > 0 ? 'rgba(201,135,58,0.12)' : 'var(--bg-overlay)', border: '1px solid ' + (filterOpen || activeFilterCount > 0 ? 'var(--border-strong)' : 'var(--border)'), color: filterOpen || activeFilterCount > 0 ? 'var(--accent)' : 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 9h10M10 14h4" />
              </svg>
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
            <button onClick={() => setModal({ isNew: true })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#0a0908', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Book
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="card-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-lg" style={{ aspectRatio: '2/3', background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: 0.5, animation: 'shimmer 1.5s infinite' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12" style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <p className="font-display text-lg" style={{ color: 'var(--text-muted)' }}>
                {activeFilterCount > 0 ? 'No books match your filters' : 'Your collection is empty'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                {activeFilterCount > 0 ? 'Try adjusting your filters' : 'Click "Add Book" or press N'}
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {filtered.map(book => (
                <BookCard key={book.id} book={book}
                  onClick={(b) => setModal({ book: b })}
                  onToggleFavorite={(id, val) => updateBook(id, { is_favorite: val })}
                  onIncrementChapter={handleIncrementChapter}
                  onClearRssUpdate={handleClearRssUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <BookModal
          book={modal.isNew ? null : modal.book}
          collection={collection}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={deleteBook}
        />
      )}
    </div>
  )
}
