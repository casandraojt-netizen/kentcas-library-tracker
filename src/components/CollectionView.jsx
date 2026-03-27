import React, { useEffect, useMemo, useState } from 'react'
import BookCard from './BookCard'
import BookModal from './BookModal'
import FilterPanel from './FilterPanel'
import ForumSearch from './ForumSearch'
import RssReader from './RssReader'

function applyFilters(books, filters) {
  let result = [...books]
  if (!filters.showR18) result = result.filter(book => !book.is_r18)
  if (filters.search) {
    const query = filters.search.toLowerCase()
    result = result.filter(book => book.title.toLowerCase().includes(query) || book.author.toLowerCase().includes(query))
  }
  if (filters.favoritesOnly) result = result.filter(book => book.is_favorite)
  if (filters.rssUpdatesOnly) result = result.filter(book => book.rss_has_update)
  if (filters.r18Only) result = result.filter(book => book.is_r18)
  if (filters.statuses?.length) result = result.filter(book => filters.statuses.includes(book.status))
  if (filters.genres?.length) result = result.filter(book => filters.genres.includes(book.genre))
  if (filters.tagSearch?.trim()) {
    const query = filters.tagSearch.toLowerCase()
    result = result.filter(book => book.tags && book.tags.toLowerCase().includes(query))
  }
  if (filters.tags?.length) {
    result = result.filter(book => {
      const bookTags = book.tags ? book.tags.split(',').map(tag => tag.trim().toLowerCase()) : []
      return filters.tags.every(tag => bookTags.includes(tag.toLowerCase()))
    })
  }
  if (filters.yearFrom) result = result.filter(book => book.year >= parseInt(filters.yearFrom, 10))
  if (filters.yearTo) result = result.filter(book => book.year <= parseInt(filters.yearTo, 10))

  const sortBy = filters.sortBy || 'updated_at'
  result.sort((a, b) => {
    if (a.rss_has_update !== b.rss_has_update) return a.rss_has_update ? -1 : 1
    if (sortBy === 'title') return a.title.localeCompare(b.title)
    if (sortBy === 'year') return (b.year || 0) - (a.year || 0)
    if (sortBy === 'status') return a.status.localeCompare(b.status)
    if (sortBy === 'status_changed_at') return new Date(b.status_changed_at || 0) - new Date(a.status_changed_at || 0)
    if (sortBy === 'rss_last_item_date') {
      const rawA = a.rss_last_item_date || a.rss_last_checked
      const rawB = b.rss_last_item_date || b.rss_last_checked
      if (!a.rss_feed_url && !b.rss_feed_url) return 0
      if (!a.rss_feed_url) return 1
      if (!b.rss_feed_url) return -1
      const dateA = rawA ? new Date(rawA).getTime() : 0
      const dateB = rawB ? new Date(rawB).getTime() : 0
      const validA = dateA > 0 && !isNaN(dateA)
      const validB = dateB > 0 && !isNaN(dateB)
      if (!validA && !validB) return 0
      if (!validA) return 1
      if (!validB) return -1
      return dateB - dateA
    }
    return new Date(b.updated_at) - new Date(a.updated_at)
  })
  return result
}

export default function CollectionView({
  shelf,
  books,
  loading,
  addBook,
  updateBook,
  deleteBook,
  cardSize = 'normal',
  allBooks = [],
  shelves = [],
  onAuthorClick,
}) {
  const [modal, setModal] = useState(null)
  const [filters, setFilters] = useState({ sortBy: shelf.collection === 'web' ? 'rss_last_item_date' : 'updated_at' })
  const [filterOpen, setFilterOpen] = useState(false)
  const [rssBook, setRssBook] = useState(null)
  const [showForumSearch, setShowForumSearch] = useState(false)

  const filtered = useMemo(() => applyFilters(books, filters), [books, filters])
  const activeFilterCount = [
    filters.search,
    filters.favoritesOnly,
    filters.rssUpdatesOnly,
    filters.r18Only,
    filters.showR18,
    ...(filters.statuses || []),
    ...(filters.genres || []),
    ...(filters.tags || []),
    filters.tagSearch,
    filters.yearFrom,
    filters.yearTo,
  ].filter(Boolean).length
  const hiddenR18Count = useMemo(() => books.filter(book => book.is_r18 && !filters.showR18).length, [books, filters.showR18])

  useEffect(() => {
    setFilters(current => ({
      ...current,
      sortBy: current.sortBy || (shelf.collection === 'web' ? 'rss_last_item_date' : 'updated_at'),
    }))
  }, [shelf.collection])

  useEffect(() => {
    const handleKey = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') return
      if (event.key === 'n' || event.key === 'N') setModal({ isNew: true })
      if (event.key === 'f' || event.key === 'F') setFilters(current => ({ ...current, favoritesOnly: !current.favoritesOnly }))
      if (event.key === '/') {
        setFilterOpen(true)
        setTimeout(() => document.querySelector('input[placeholder="Title, author..."]')?.focus(), 100)
      }
      if ((event.key === 's' || event.key === 'S') && shelf.collection === 'web') setShowForumSearch(true)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [shelf.collection])

  const handleSave = async (bookData) => {
    if (bookData.id && allBooks.find(book => book.id === bookData.id)) {
      await updateBook(bookData.id, bookData)
    } else {
      await addBook({
        ...bookData,
        collection: shelf.collection,
        shelves: bookData.shelves || (shelf.id === shelf.collection ? [shelf.collection] : [shelf.collection, shelf.id]),
      })
    }
  }

  const handleForumAdd = async (item) => {
    await addBook({
      ...item,
      collection: shelf.collection,
      shelves: shelf.id === shelf.collection ? [shelf.collection] : [shelf.collection, shelf.id],
    })
  }

  const handleIncrementChapter = async (id, newChapter) => {
    await updateBook(id, { current_chapter: newChapter })
  }

  const handleClearRssUpdate = async (id) => {
    await window.api.clearRssUpdate(id)
    await updateBook(id, { rss_has_update: false })
  }

  const rssUpdateCount = books.filter(book => book.rss_has_update).length

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-shrink-0 overflow-y-auto transition-all duration-200"
        style={{ width: filterOpen ? '220px' : '0px', opacity: filterOpen ? 1 : 0, padding: filterOpen ? '20px 16px' : '0', borderRight: filterOpen ? '1px solid var(--border)' : 'none', background: 'var(--bg-surface)', overflow: filterOpen ? 'auto' : 'hidden' }}>
        {filterOpen && <FilterPanel collection={shelf.collection} filters={filters} onChange={setFilters} />}
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{shelf.name}</h1>
              {rssUpdateCount > 0 && (
                <span className="px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(90,154,110,0.15)', color: '#5a9a6e', border: '1px solid rgba(90,154,110,0.3)', fontFamily: 'DM Sans, sans-serif', fontSize: '11px' }}>
                  {rssUpdateCount} new
                </span>
              )}
              {hiddenR18Count > 0 && (
                <button onClick={() => setFilters(current => ({ ...current, showR18: !current.showR18 }))}
                  style={{ background: 'rgba(154,64,64,0.1)', color: '#ffaaaa', border: '1px solid rgba(154,64,64,0.3)', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', padding: '1px 8px', borderRadius: '10px', cursor: 'pointer' }}>
                  {filters.showR18 ? 'hide R18' : `+${hiddenR18Count} R18`}
                </button>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
              {shelf.description} · {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
              {activeFilterCount > 0 && ` (filtered from ${books.length})`}
              <span style={{ marginLeft: '8px', opacity: 0.5 }}>
                · N=add{shelf.collection === 'web' ? ' · S=forum search' : ''} · /=search · F=favorites
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {shelf.collection === 'web' && (
              <button onClick={() => setShowForumSearch(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
                Forum Search
              </button>
            )}
            <button onClick={() => setFilterOpen(open => !open)}
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

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className={`card-grid-${cardSize}`}>
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="rounded-lg" style={{ aspectRatio: '2/3', background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: 0.5 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12" style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <p className="font-display text-lg" style={{ color: 'var(--text-muted)' }}>
                {activeFilterCount > 0 ? 'No books match your filters' : 'This shelf is empty'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                {activeFilterCount > 0 ? 'Try adjusting your filters' : `Click "Add Book" or press N${shelf.collection === 'web' ? ', or press S to search forums' : ''}`}
              </p>
            </div>
          ) : (
            <div className={`card-grid-${cardSize}`}>
              {filtered.map(book => (
                <BookCard
                  key={book.id}
                  book={book}
                  showR18={filters.showR18}
                  onClick={(selected) => setModal({ book: selected })}
                  onEdit={(selected) => setModal({ book: selected })}
                  onToggleFavorite={(id, value) => updateBook(id, { is_favorite: value })}
                  onIncrementChapter={handleIncrementChapter}
                  onClearRssUpdate={handleClearRssUpdate}
                  onAuthorClick={onAuthorClick}
                  onOpenRss={(book) => setRssBook(book)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <BookModal
          book={modal.isNew ? null : modal.book}
          collection={modal.isNew ? shelf.collection : modal.book.collection}
          shelf={modal.isNew ? shelf.id : (modal.book.shelves?.[0] || modal.book.shelf)}
          shelves={shelves}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={deleteBook}
          onOpenRss={(book) => { setModal(null); setRssBook(book) }}
          onAuthorClick={(author) => { setModal(null); onAuthorClick?.(author) }}
          existingBooks={allBooks}
        />
      )}

      {rssBook && (
        <RssReader
          book={rssBook}
          onClose={() => setRssBook(null)}
        />
      )}

      {showForumSearch && (
        <ForumSearch
          onClose={() => setShowForumSearch(false)}
          onAdd={handleForumAdd}
        />
      )}
    </div>
  )
}
