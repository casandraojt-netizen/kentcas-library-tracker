import React, { useEffect, useMemo, useState } from 'react'
import { getGenres, getShelfLabel, getStatuses, WEB_TYPES } from '../constants'
import { getBookShelves } from '../library'
import CoverSearch from './CoverSearch'
import TagInput from './TagInput'

function formatDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BookModal({
  book,
  collection,
  shelf,
  shelves = [],
  onClose,
  onSave,
  onDelete,
  onOpenRss,
  onAuthorClick,
  existingBooks = [],
}) {
  const isNew = !book?.id
  const [form, setForm] = useState(() => {
    const initialShelves = shelf && shelf !== collection
      ? [collection, shelf]
      : [collection]
    const defaults = {
      title: '',
      author: '',
      cover_url: '',
      genre: '',
      status: 'unread',
      current_chapter: '',
      total_chapters: '',
      notes: '',
      source_url: '',
      rss_feed_url: '',
      tags: '',
      is_favorite: false,
      is_r18: false,
      web_type: 'novel',
      collection,
      shelves: initialShelves,
    }
    const overrides = book
      ? { ...book, year: book.year ?? '', shelves: getBookShelves(book) }
      : { year: '' }
    return { ...defaults, ...overrides }
  })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showCoverSearch, setShowCoverSearch] = useState(false)

  const statuses = getStatuses(form.collection)
  const genres = getGenres(form.collection)
  const shelfOptions = useMemo(
    () => shelves.filter(item => item.collection === form.collection && !item.isDefault),
    [form.collection, shelves]
  )

  const duplicate = isNew && form.title.trim()
    ? existingBooks.find(item => item.title.trim().toLowerCase() === form.title.trim().toLowerCase() && item.id !== book?.id)
    : null
  const originalStatus = book?.status
  const statusWillChange = !isNew && form.status !== originalStatus
  const currentStatusInfo = statuses.find(item => item.value === form.status)
  const originalStatusInfo = statuses.find(item => item.value === originalStatus)

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const toggleShelf = (shelfId) => {
    setForm(current => {
      const exists = current.shelves.includes(shelfId)
      const nextShelves = exists
        ? current.shelves.filter(item => item !== shelfId)
        : [...current.shelves, shelfId]
      const normalizedShelves = [current.collection, ...nextShelves.filter(item => item && item !== current.collection)]
      return { ...current, shelves: normalizedShelves }
    })
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSave({
        ...form,
        shelves: [form.collection, ...form.shelves.filter(item => item && item !== form.collection)],
        year: form.year ? parseInt(form.year, 10) : null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await onDelete(book.id)
    onClose()
  }

  const handleCoverSelect = (coverUrl, title, author, year) => {
    set('cover_url', coverUrl)
    if (!form.title && title) set('title', title)
    if (!form.author && author) set('author', author)
    if (!form.year && year) set('year', String(year))
  }

  useEffect(() => {
    const handler = (event) => {
      if (event.key === 'Escape' && !showCoverSearch) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, showCoverSearch])

  const inputStyle = {
    background: 'var(--bg-overlay)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
    transition: 'border-color 0.15s',
  }
  const focusInput = (event) => { event.target.style.borderColor = 'var(--accent)' }
  const blurInput = (event) => { event.target.style.borderColor = 'var(--border)' }
  const Label = ({ children }) => (
    <label style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px', display: 'block' }}>
      {children}
    </label>
  )

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
        <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl fade-in"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
          onClick={event => event.stopPropagation()}>

          <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
            style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isNew ? 'Add Book' : 'Edit Book'}
            </h2>
            <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '6px' }}
              onMouseEnter={event => event.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={event => event.currentTarget.style.color = 'var(--text-muted)'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-24 h-36 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer group relative"
                  style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)' }}
                  onClick={() => setShowCoverSearch(true)}>
                  {form.cover_url ? (
                    <img src={form.cover_url} alt="cover" className="w-full h-full object-cover" onError={event => event.target.style.display = 'none'} />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-8 h-8" style={{ color: 'var(--text-muted)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.6)', fontSize: '10px', color: '#fff', fontFamily: 'DM Sans, sans-serif', textAlign: 'center', padding: '4px' }}>
                    Search
                  </div>
                </div>
                <button onClick={() => setShowCoverSearch(true)} className="w-full mt-1.5 text-center text-xs"
                  style={{ color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', fontSize: '10px' }}>
                  Search cover
                </button>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <Label>Title *</Label>
                  <input style={inputStyle} value={form.title} onChange={event => set('title', event.target.value)} placeholder="Book title" onFocus={focusInput} onBlur={blurInput} />
                  {duplicate && (
                    <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(201,135,58,0.08)', border: '1px solid rgba(201,135,58,0.3)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <p style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: 'var(--accent)' }}>
                        Possible duplicate: "<strong>{duplicate.title}</strong>" already exists in {getBookShelves(duplicate).map(getShelfLabel).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Cover Image URL</Label>
                  <input style={inputStyle} value={form.cover_url} onChange={event => set('cover_url', event.target.value)} placeholder="https://... or use search above" onFocus={focusInput} onBlur={blurInput} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Author</Label>
                <input style={inputStyle} value={form.author} onChange={event => set('author', event.target.value)} placeholder="Author name" onFocus={focusInput} onBlur={blurInput} />
                {!isNew && form.author.trim() && onAuthorClick && (
                  <button
                    type="button"
                    onClick={() => onAuthorClick(form.author)}
                    style={{ marginTop: '6px', padding: 0, border: 'none', background: 'transparent', color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', cursor: 'pointer' }}
                  >
                    View author page
                  </button>
                )}
              </div>
              <div>
                <Label>Year Published</Label>
                <input style={inputStyle} type="number" value={form.year} onChange={event => set('year', event.target.value)} placeholder="e.g. 2020" onFocus={focusInput} onBlur={blurInput} />
              </div>
            </div>

            <div>
              <Label>Shelves</Label>
              {shelfOptions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {shelfOptions.map(option => {
                    const active = form.shelves.includes(option.id)
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleShelf(option.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '999px',
                          border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                          background: active ? 'rgba(201,135,58,0.14)' : 'var(--bg-overlay)',
                          color: active ? 'var(--accent)' : 'var(--text-secondary)',
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '12px',
                        }}
                      >
                        {option.name}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
                  No custom shelves yet for this collection.
                </div>
              )}
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', marginTop: '6px' }}>
                Every book stays in the {collection === 'physical' ? 'Physical Books' : 'Web Books'} collection automatically. Toggle any extra shelves you want on top of that.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Genre</Label>
                <select style={inputStyle} value={form.genre} onChange={event => set('genre', event.target.value)}>
                  <option value="">Select genre</option>
                  {genres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select style={inputStyle} value={form.status} onChange={event => set('status', event.target.value)}>
                  {statuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </div>
            </div>

            {!isNew && (
              <div className="rounded-lg px-4 py-3 flex items-start gap-3"
                style={{ background: 'rgba(201,135,58,0.06)', border: '1px solid var(--border)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <div className="flex-1">
                  {statusWillChange ? (
                    <>
                      <p style={{ fontSize: '12px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Changing from{' '}
                        <span style={{ color: originalStatusInfo?.color || 'var(--accent-light)', fontWeight: '500' }}>{originalStatusInfo?.label || originalStatus}</span>
                        {' '}to{' '}
                        <span style={{ color: currentStatusInfo?.color || 'var(--accent-light)', fontWeight: '500' }}>{currentStatusInfo?.label || form.status}</span>
                      </p>
                      <p style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: 'var(--accent)', marginTop: '3px' }}>
                        Status date will be stamped as today on save
                      </p>
                    </>
                  ) : form.status_changed_at ? (
                    <p style={{ fontSize: '12px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      <span style={{ color: currentStatusInfo?.color || 'var(--accent-light)', fontWeight: '500' }}>{currentStatusInfo?.label || form.status}</span>
                      {' '}since{' '}
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{formatDate(form.status_changed_at)}</span>
                    </p>
                  ) : (
                    <p style={{ fontSize: '12px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-muted)' }}>Status date will be recorded on next save</p>
                  )}
                </div>
              </div>
            )}

            {form.collection === 'web' && (
              <div>
                <Label>Type</Label>
                <div className="flex gap-3">
                  {WEB_TYPES.map(type => (
                    <button key={type.value} type="button" onClick={() => set('web_type', type.value)}
                      style={{ padding: '7px 16px', borderRadius: '6px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', background: form.web_type === type.value ? 'var(--accent)' : 'var(--bg-overlay)', color: form.web_type === type.value ? '#0a0908' : 'var(--text-secondary)', border: '1px solid ' + (form.web_type === type.value ? 'var(--accent)' : 'var(--border)') }}>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{form.collection === 'web' ? 'Latest Chapter Read' : 'Current Chapter / Volume'}</Label>
                <input style={inputStyle} value={form.current_chapter} onChange={event => set('current_chapter', event.target.value)} placeholder="e.g. 42 or Vol. 3" onFocus={focusInput} onBlur={blurInput} />
              </div>
              <div>
                <Label>Total Chapters / Volumes</Label>
                <input style={inputStyle} value={form.total_chapters} onChange={event => set('total_chapters', event.target.value)} placeholder="Total or 'Ongoing'" onFocus={focusInput} onBlur={blurInput} />
              </div>
            </div>

            {form.collection === 'web' && (
              <div>
                <Label>Source URL</Label>
                <input style={inputStyle} value={form.source_url} onChange={event => set('source_url', event.target.value)} placeholder="Link to novel/comic page" onFocus={focusInput} onBlur={blurInput} />
              </div>
            )}

            {form.collection === 'web' && (
              <div>
                <Label>RSS Feed URL (for update notifications)</Label>
                <input style={inputStyle} value={form.rss_feed_url} onChange={event => set('rss_feed_url', event.target.value)} placeholder="https://example.com/feed.rss" onFocus={focusInput} onBlur={blurInput} />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', marginTop: '4px' }}>
                  The app will check this feed every 30 minutes and notify you of new chapters
                </p>
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} value={form.notes} onChange={event => set('notes', event.target.value)} placeholder="Personal notes..." onFocus={focusInput} onBlur={blurInput} />
            </div>

            <div>
              <Label>Tags</Label>
              <TagInput tags={form.tags || ''} onChange={value => set('tags', value)} />
            </div>

            <button type="button" onClick={() => set('is_favorite', !form.is_favorite)} className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
              style={{ background: form.is_favorite ? 'rgba(240,192,64,0.12)' : 'var(--bg-overlay)', border: '1px solid ' + (form.is_favorite ? 'rgba(240,192,64,0.4)' : 'var(--border)'), color: form.is_favorite ? '#f0c040' : 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
              <svg viewBox="0 0 24 24" fill={form.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {form.is_favorite ? 'Favorited' : 'Add to Favorites'}
            </button>

            <button type="button" onClick={() => set('is_r18', !form.is_r18)} className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
              style={{ background: form.is_r18 ? 'rgba(154,64,64,0.12)' : 'var(--bg-overlay)', border: '1px solid ' + (form.is_r18 ? 'rgba(154,64,64,0.4)' : 'var(--border)'), color: form.is_r18 ? '#ffaaaa' : 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', fontFamily: 'DM Sans, sans-serif' }}>R18</span>
              {form.is_r18 ? 'Marked as R18 (blurred by default)' : 'Mark as R18 content'}
            </button>
          </div>

          <div className="flex items-center justify-between px-6 py-4 sticky bottom-0"
            style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
            <div>
              {!isNew && (
                <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{ color: confirmDelete ? '#f0a0a0' : 'var(--text-muted)', background: confirmDelete ? 'rgba(154,64,64,0.15)' : 'transparent', fontFamily: 'DM Sans, sans-serif' }}>
                  {confirmDelete ? 'Confirm Delete' : 'Delete'}
                </button>
              )}
            </div>
            <div className="flex gap-3">
              {!isNew && book?.rss_feed_url && onOpenRss && (
                <button onClick={() => { onClose(); onOpenRss(book) }}
                  className="flex items-center gap-1.5"
                  style={{ padding: '8px 14px', borderRadius: '6px', color: 'var(--accent)', background: 'rgba(201,135,58,0.08)', border: '1px solid rgba(201,135,58,0.25)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 19.5v-.75a7.5 7.5 0 00-7.5-7.5H4.5m0-6.75h.75c7.87 0 14.25 6.38 14.25 14.25v.75M6 18.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                  RSS Reader
                </button>
              )}
              <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', color: 'var(--text-secondary)', background: 'var(--bg-overlay)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleSave} disabled={!form.title.trim() || saving}
                style={{ padding: '8px 20px', borderRadius: '6px', background: 'var(--accent)', color: '#0a0908', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: '500', opacity: !form.title.trim() || saving ? 0.5 : 1 }}>
                {saving ? 'Saving...' : isNew ? 'Add Book' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCoverSearch && (
        <CoverSearch
          onSelect={handleCoverSelect}
          onClose={() => setShowCoverSearch(false)}
        />
      )}
    </>
  )
}
