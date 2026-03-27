import React, { useState } from 'react'
import { getStatusInfo } from '../constants'

function formatStatusDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function BookCard({ book, onClick, onEdit, onToggleFavorite, onIncrementChapter, onClearRssUpdate, onAuthorClick, onOpenRss, showR18 }) {
  const [imgError, setImgError] = useState(false)
  const [incrementing, setIncrementing] = useState(false)
  const statusInfo = getStatusInfo(book.status)
  const statusDate = formatStatusDate(book.status_changed_at)

  const handleFavorite = (e) => { e.stopPropagation(); onToggleFavorite(book.id, !book.is_favorite) }

  const handleIncrement = async (e) => {
    e.stopPropagation()
    const chapter = book.current_chapter || '0'
    // Find the last number anywhere in the string and increment just that part.
    // "c14" → "c15", "v7v31" → "v7v32", "Vol. 3 Ch. 12" → "Vol. 3 Ch. 13", "42" → "43"
    const incremented = chapter.replace(/(\d+)(?!.*\d)/, (n) => String(parseInt(n) + 1))
    setIncrementing(true)
    await onIncrementChapter(book.id, incremented)
    setTimeout(() => setIncrementing(false), 600)
  }

  const handleRssClear = (e) => {
    e.stopPropagation()
    onClearRssUpdate(book.id)
  }

  // Show +1 as long as the chapter string contains at least one digit to increment
  const canIncrement = /\d/.test(book.current_chapter || '0')

  return (
    <div
      onClick={() => onClick(book)}
      className="fade-in group relative cursor-pointer rounded-lg overflow-hidden"
      style={{
        background: 'var(--bg-card)', border: `1px solid ${book.rss_has_update ? 'rgba(90,154,110,0.5)' : 'var(--border)'}`,
        aspectRatio: '2/3', display: 'flex', flexDirection: 'column',
        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
        boxShadow: book.rss_has_update ? '0 0 12px rgba(90,154,110,0.15)' : 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = book.rss_has_update ? '0 8px 24px rgba(90,154,110,0.2)' : '0 8px 24px rgba(0,0,0,0.4)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = book.rss_has_update ? '0 0 12px rgba(90,154,110,0.15)' : 'none' }}
    >
      {/* Cover */}
      <div className="relative flex-1 overflow-hidden" style={{ background: 'var(--bg-overlay)', minHeight: 0, filter: book.is_r18 && !showR18 ? 'blur(12px)' : 'none', transition: 'filter 0.2s' }}>
        {book.cover_url && !imgError ? (
          <img src={book.cover_url} alt={book.title} onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="relative w-full h-full">
            <img src="book-cover.png" alt="default cover"
              className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 px-3">
              <p className="text-center font-display font-semibold leading-tight line-clamp-2"
                style={{ fontSize: '11px', color: 'rgba(201,135,58,0.9)', textShadow: '0 1px 3px rgba(0,0,0,0.8)', wordBreak: 'break-word' }}>
                {book.title}
              </p>
              {book.author && (
                <p className="text-center mt-1 truncate w-full"
                  style={{ fontSize: '9px', color: 'rgba(201,135,58,0.6)', fontFamily: 'DM Sans, sans-serif' }}>
                  {book.author}
                </p>
              )}
            </div>
          </div>
        )}

        {/* RSS update badge */}
        {book.rss_has_update && (
          <button onClick={handleRssClear} title={`New update: ${book.rss_last_item_title} — click to dismiss`}
            className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded transition-opacity"
            style={{ background: 'rgba(90,154,110,0.85)', color: '#fff', fontSize: '9px', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.04em', fontWeight: '600' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#aef', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            NEW
          </button>
        )}

        {/* Status badge — hidden on hover for RSS books to show edit button */}
        {!book.rss_has_update && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded"
            style={{ background: statusInfo.color + '22', color: statusInfo.color, border: `1px solid ${statusInfo.color}44`, fontSize: '9px', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.04em', fontWeight: '500' }}>
            {statusInfo.label.toUpperCase()}
          </div>
        )}

        {/* Favorite */}
        <button onClick={handleFavorite} className="absolute top-2 right-2 rounded p-0.5 transition-colors"
          style={{ color: book.is_favorite ? '#f0c040' : 'rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)' }}>
          <svg viewBox="0 0 24 24" fill={book.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>

        {/* Edit button — always accessible even on RSS books */}
        {onEdit && (
          <button onClick={(e) => { e.stopPropagation(); onEdit(book) }}
            title="Edit book"
            className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded"
            style={{ width: '22px', height: '22px', background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.8)', zIndex: 10, display: book.rss_feed_url ? undefined : 'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </button>
        )}

        {/* R18 badge */}
        {book.is_r18 && (
          <div className="absolute bottom-8 left-2 px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(154,64,64,0.85)', color: '#ffaaaa', fontSize: '9px', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.05em', fontWeight: '600' }}>
            R18
          </div>
        )}

        {/* Quick +1 button — shows on hover if chapter is numeric */}
        {canIncrement && (
          <button onClick={handleIncrement}
            className="absolute bottom-2 right-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center"
            style={{ width: '26px', height: '26px', background: incrementing ? 'var(--status-finished)' : 'var(--accent)', color: '#0a0908', fontSize: '14px', fontWeight: '700', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', transform: incrementing ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.2s' }}
            title="Mark next chapter as read">
            {incrementing ? '✓' : '+1'}
          </button>
        )}

        {/* Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(10,9,8,0.9), transparent)' }} />
      </div>

      {/* Info */}
      <div className="px-2.5 py-2 flex-shrink-0" style={{ background: 'var(--bg-card)' }}>
        <p className="font-display font-semibold truncate leading-tight mb-0.5" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
          {book.title}
        </p>
        {book.author && (
          onAuthorClick ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAuthorClick(book.author) }}
              className="truncate text-left"
              style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              {book.author}
            </button>
          ) : (
            <p className="truncate" style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>{book.author}</p>
          )
        )}
        {book.tags && (
          <div className="flex flex-wrap gap-1 mt-1">
            {book.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 2).map(tag => (
              <span key={tag} style={{ fontSize: '9px', fontFamily: 'DM Sans, sans-serif', padding: '1px 5px', borderRadius: '10px', background: 'rgba(201,135,58,0.1)', color: 'var(--accent)', border: '1px solid rgba(201,135,58,0.2)', whiteSpace: 'nowrap' }}>
                {tag}
              </span>
            ))}
            {book.tags.split(',').filter(t => t.trim()).length > 2 && (
              <span style={{ fontSize: '9px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-muted)' }}>
                +{book.tags.split(',').filter(t => t.trim()).length - 2}
              </span>
            )}
          </div>
        )}
        {(() => {
          const cur = parseFloat(book.current_chapter)
          const tot = parseFloat(book.total_chapters)
          if (!isNaN(cur) && !isNaN(tot) && tot > 0) {
            const pct = Math.min(100, Math.round((cur / tot) * 100))
            return (
              <div className="mt-1.5 mb-0.5">
                <div className="relative w-full rounded-full overflow-hidden" style={{ height: '3px', background: 'var(--bg-overlay)' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--status-finished)' : 'var(--accent)', borderRadius: '9999px', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )
          }
          return null
        })()}
        <div className="flex items-center justify-between mt-1 gap-1">
          {book.current_chapter ? (
            <p className="truncate" style={{ fontSize: '10px', color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif' }}>
              Ch. {book.current_chapter}
            </p>
          ) : <span />}
          {book.rss_feed_url && (
            <button onClick={(e) => { e.stopPropagation(); onOpenRss && onOpenRss(book) }}
              title="Open RSS reader"
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--accent)', padding: '0 2px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '10px', height: '10px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 19.5v-.75a7.5 7.5 0 00-7.5-7.5H4.5m0-6.75h.75c7.87 0 14.25 6.38 14.25 14.25v.75M6 18.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </button>
          )}
        {statusDate && (
            <p className="truncate flex-shrink-0" title={`Status set: ${statusDate}`}
              style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
              {statusDate}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
