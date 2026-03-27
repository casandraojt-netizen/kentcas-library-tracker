import React, { useMemo, useState } from 'react'
import BookCard from './BookCard'
import BookModal from './BookModal'
import RssReader from './RssReader'
import { getShelfLabel } from '../constants'
import { getBookShelves, getBookShelf } from '../library'

export default function AuthorView({
  author,
  books,
  shelves,
  allBooks,
  cardSize,
  updateBook,
  deleteBook,
  onBack,
  onAuthorClick,
}) {
  const [modalBook, setModalBook] = useState(null)
  const [rssBook, setRssBook] = useState(null)

  const shelfSummary = useMemo(() => {
    const counts = new Map()
    for (const book of books) {
      for (const key of getBookShelves(book)) {
        counts.set(key, (counts.get(key) || 0) + 1)
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [books])

  const handleIncrementChapter = async (id, newChapter) => {
    await updateBook(id, { current_chapter: newChapter })
  }

  const handleClearRssUpdate = async (id) => {
    await window.api.clearRssUpdate(id)
    await updateBook(id, { rss_has_update: false })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 mb-3"
          style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', padding: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to shelves
        </button>
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{author}</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
          {books.length} {books.length === 1 ? 'book' : 'books'} in your library
        </p>
        {shelfSummary.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {shelfSummary.map(([shelfId, count]) => (
              <span key={shelfId}
                style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', padding: '3px 8px', borderRadius: '999px', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {getShelfLabel(shelfId)} · {count}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-6">
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="font-display text-lg" style={{ color: 'var(--text-muted)' }}>No books found for this author</p>
          </div>
        ) : (
          <div className={`card-grid-${cardSize}`}>
            {books.map(book => (
              <BookCard
                key={book.id}
                book={book}
                showR18
                onClick={(selected) => setModalBook(selected)}
                onEdit={(selected) => setModalBook(selected)}
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

      {modalBook && (
        <BookModal
          book={modalBook}
          collection={modalBook.collection}
          shelf={getBookShelf(modalBook)}
          shelves={shelves}
          onClose={() => setModalBook(null)}
          onSave={(bookData) => updateBook(modalBook.id, bookData)}
          onDelete={deleteBook}
          onOpenRss={(book) => { setModalBook(null); setRssBook(book) }}
          onAuthorClick={(selectedAuthor) => { setModalBook(null); onAuthorClick?.(selectedAuthor) }}
          existingBooks={allBooks}
        />
      )}

      {rssBook && (
        <RssReader
          book={rssBook}
          onClose={() => setRssBook(null)}
        />
      )}
    </div>
  )
}
