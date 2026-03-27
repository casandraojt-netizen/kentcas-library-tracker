import React, { useEffect, useMemo, useState } from 'react'
import AuthorView from './components/AuthorView'
import CollectionView from './components/CollectionView'
import ExportImportModal from './components/ExportImportModal'
import ImportModal from './components/ImportModal'
import ReadingHistoryView from './components/ReadingHistoryView'
import SettingsModal from './components/SettingsModal'
import ShelfModal from './components/ShelfModal'
import StatsView from './components/StatsView'
import SyncStatus from './components/SyncStatus'
import { DEFAULT_SHELVES, getCollectionLabel } from './constants'
import { useBooks } from './hooks/useBooks'
import { useReadingHistory } from './hooks/useReadingHistory'
import { useSettings } from './hooks/useSettings'
import { buildShelves, getBookShelf, getBookShelves, getBooksByAuthor, getBooksInShelf } from './library'

const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
  </svg>
)

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
)

const ShelfIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V6.75A2.25 2.25 0 015.25 4.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9M7.5 12h9M7.5 15.75h6" />
  </svg>
)

const StatsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
)

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12a8.25 8.25 0 111.943 5.307L3 20.25" />
  </svg>
)

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

function getShelfIcon(shelf) {
  if (shelf.id === 'physical') return BookIcon
  if (shelf.id === 'web') return GlobeIcon
  return ShelfIcon
}

export default function App() {
  const [activeView, setActiveView] = useState({ type: 'shelf', shelfId: 'physical' })
  const [historyPage, setHistoryPage] = useState(1)
  const [historyFilters, setHistoryFilters] = useState({
    search: '',
    shelf: '',
    genre: '',
    tag: '',
    eventTypes: [],
    showAll: false,
  })
  const { settings, update } = useSettings()
  const [showSettings, setShowSettings] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showExportImport, setShowExportImport] = useState(false)
  const [showCreateShelf, setShowCreateShelf] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)

  const booksStore = useBooks()
  const historyStore = useReadingHistory(historyPage, 20, historyFilters)
  const allBooks = booksStore.books

  const shelves = useMemo(() => buildShelves(allBooks, settings.customShelves), [allBooks, settings.customShelves])
  const currentShelf = useMemo(() => {
    const fallback = shelves[0] || DEFAULT_SHELVES[0]
    if (activeView.type !== 'shelf') return fallback
    return shelves.find(shelf => shelf.id === activeView.shelfId) || fallback
  }, [activeView, shelves])
  const currentShelfBooks = useMemo(() => getBooksInShelf(allBooks, currentShelf.id), [allBooks, currentShelf.id])
  const authorBooks = useMemo(
    () => activeView.type === 'author' ? getBooksByAuthor(allBooks, activeView.author) : [],
    [activeView, allBooks]
  )
  const physicalBooks = useMemo(() => allBooks.filter(book => book.collection === 'physical'), [allBooks])
  const webBooks = useMemo(() => allBooks.filter(book => book.collection === 'web'), [allBooks])
  const historyGenres = useMemo(() => [...new Set(allBooks.map(book => book.genre).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [allBooks])

  useEffect(() => {
    const unsubscribeRss = window.api.onRssUpdate((event) => {
      if (event.type === 'update') booksStore.refetch()
    })
    const unsubscribeUpdate = window.api.onUpdateReady(() => setUpdateReady(true))
    return () => {
      unsubscribeRss()
      unsubscribeUpdate()
    }
  }, [booksStore.refetch])

  useEffect(() => {
    if (activeView.type === 'history') historyStore.refetch()
  }, [activeView.type, historyStore.refetch])

  useEffect(() => {
    setHistoryPage(1)
  }, [historyFilters])

  const refreshAfterMutation = async () => {
    historyStore.refetch()
  }

  const handleAddBook = async (book) => {
    const saved = await booksStore.addBook(book)
    await refreshAfterMutation()
    return saved
  }

  const handleUpdateBook = async (id, updates) => {
    const saved = await booksStore.updateBook(id, updates)
    await refreshAfterMutation()
    return saved
  }

  const handleDeleteBook = async (id) => {
    await booksStore.deleteBook(id)
    await refreshAfterMutation()
  }

  const handleImport = async (books) => {
    const result = await window.api.importBooks(books)
    if (result.success) {
      await booksStore.refetch()
      await refreshAfterMutation()
    }
    return result
  }

  const handleAuthorOpen = (author) => {
    setActiveView({
      type: 'author',
      author,
      from: activeView.type === 'author' ? activeView.from : activeView,
    })
  }

  const handleCreateShelf = ({ name, collection }) => {
    const nextShelves = [...settings.customShelves, { name, collection }]
    update('customShelves', nextShelves)
    setActiveView({ type: 'shelf', shelfId: name })
    setShowCreateShelf(false)
  }

  const exportCSV = (booksToExport, filename) => {
    const headers = ['title', 'author', 'genre', 'status', 'current_chapter', 'total_chapters', 'year', 'notes', 'source_url', 'rss_feed_url', 'tags', 'is_favorite', 'is_r18', 'collection', 'shelf', 'shelves', 'web_type']
    const nl = String.fromCharCode(10)
    const quote = (value) => {
      const stringValue = String(value === undefined || value === null ? '' : value)
      return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes(nl)
        ? `"${stringValue.replace(/"/g, '""')}"`
        : stringValue
    }
    const rows = booksToExport.map(book => headers.map(header => {
      if (header === 'shelf') return quote(getBookShelf(book))
      if (header === 'shelves') return quote(getBookShelves(book).join('|'))
      return quote(book[header])
    }).join(','))
    const csv = [headers.join(','), ...rows].join(nl)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportOPML = (booksToExport, filename) => {
    const withFeeds = booksToExport.filter(book => book.rss_feed_url)
    if (!withFeeds.length) {
      alert('No books with RSS feed URLs found in the current selection.')
      return
    }
    const nl = String.fromCharCode(10)
    const escapeXml = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const outlines = withFeeds.map(book => {
      const title = escapeXml(book.title)
      const feed = escapeXml(book.rss_feed_url)
      const site = escapeXml(book.source_url || book.rss_feed_url.split('/threadmarks')[0])
      return `    <outline type="rss" text="${title}" title="${title}" xmlUrl="${feed}" htmlUrl="${site}"/>`
    }).join(nl)
    const opml = '<?xml version="1.0" encoding="UTF-8"?>' + nl +
      '<opml version="1.0">' + nl +
      '  <head>' + nl +
      '    <title>Library Tracker RSS Feeds</title>' + nl +
      '    <dateCreated>' + new Date().toUTCString() + '</dateCreated>' + nl +
      '  </head>' + nl +
      '  <body>' + nl +
      '    <outline text="Library Tracker" title="Library Tracker">' + nl +
      outlines + nl +
      '    </outline>' + nl +
      '  </body>' + nl +
      '</opml>'
    const blob = new Blob([opml], { type: 'text/xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const selectedExportBooks = activeView.type === 'shelf'
    ? currentShelfBooks
    : activeView.type === 'author'
      ? authorBooks
      : allBooks

  const totalRssUpdates = allBooks.filter(book => book.rss_has_update).length
  const totalFavorites = allBooks.filter(book => book.is_favorite).length
  const totalReading = allBooks.filter(book => book.status === 'reading').length
  const totalFinished = allBooks.filter(book => book.status === 'finished').length

  const NavItem = ({ icon: Icon, label, active, count, badge, onClick, secondary }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150"
      style={{ background: active ? 'rgba(201,135,58,0.12)' : 'transparent', border: '1px solid ' + (active ? 'rgba(201,135,58,0.25)' : 'transparent'), color: active ? 'var(--accent-light)' : 'var(--text-secondary)' }}
      onMouseEnter={event => { if (!active) event.currentTarget.style.background = 'var(--bg-overlay)' }}
      onMouseLeave={event => { if (!active) event.currentTarget.style.background = 'transparent' }}
    >
      <Icon />
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: '13px', fontFamily: 'DM Sans, sans-serif', fontWeight: active ? '500' : '400' }}>{label}</div>
        {secondary && <div style={{ fontSize: '10px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-muted)' }}>{secondary}</div>}
      </div>
      <div className="flex items-center gap-1">
        {badge ? (
          <span style={{ fontSize: '10px', color: '#5a9a6e', background: 'rgba(90,154,110,0.15)', padding: '1px 5px', borderRadius: '10px', border: '1px solid rgba(90,154,110,0.3)' }}>
            {badge}
          </span>
        ) : null}
        {count !== undefined && (
          <span style={{ fontSize: '11px', color: active ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-overlay)', padding: '1px 6px', borderRadius: '10px' }}>
            {count}
          </span>
        )}
      </div>
    </button>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="flex flex-col flex-shrink-0" style={{ width: '240px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>
        <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h1 className="font-display font-semibold leading-tight" style={{ fontSize: '20px', color: 'var(--accent-light)' }}>Library</h1>
          <p className="font-display italic" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tracker</p>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="flex items-center justify-between px-2 mb-2">
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Shelves
            </p>
            <button
              type="button"
              onClick={() => setShowCreateShelf(true)}
              style={{ border: 'none', background: 'transparent', color: 'var(--accent)', padding: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer' }}
            >
              + New
            </button>
          </div>
          <div className="space-y-1">
            {shelves.map(shelf => {
              const Icon = getShelfIcon(shelf)
              const shelfBooks = getBooksInShelf(allBooks, shelf.id)
              const shelfBadge = shelf.collection === 'web' ? shelfBooks.filter(book => book.rss_has_update).length : 0
              return (
                <NavItem
                  key={shelf.id}
                  icon={Icon}
                  label={shelf.name}
                  secondary={shelf.isDefault ? undefined : getCollectionLabel(shelf.collection)}
                  active={activeView.type === 'shelf' && activeView.shelfId === shelf.id}
                  count={shelfBooks.length}
                  badge={shelfBadge || undefined}
                  onClick={() => setActiveView({ type: 'shelf', shelfId: shelf.id })}
                />
              )
            })}
          </div>

          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="space-y-1">
              <NavItem
                icon={HistoryIcon}
                label="Reading History"
                active={activeView.type === 'history'}
                count={historyStore.history.totalCount}
                onClick={() => { setHistoryPage(1); setActiveView({ type: 'history' }) }}
              />
              <NavItem
                icon={StatsIcon}
                label="Statistics"
                active={activeView.type === 'stats'}
                onClick={() => setActiveView({ type: 'stats' })}
              />
            </div>
          </div>
        </nav>

        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-base)' }}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Favorites', value: totalFavorites },
              { label: 'Reading', value: totalReading },
              { label: 'Finished', value: totalFinished },
              { label: 'Updates', value: totalRssUpdates },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', background: 'var(--bg-overlay)' }}>
                <div style={{ fontSize: '16px', fontFamily: 'Cormorant Garamond, serif', fontWeight: '600', color: 'var(--accent)' }}>{stat.value}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 flex-shrink-0 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <input type="range" min="0" max="2" step="1"
              value={['compact', 'normal', 'large'].indexOf(settings.cardSize)}
              onChange={event => update('cardSize', ['compact', 'normal', 'large'][event.target.value])}
              className="flex-1" style={{ accentColor: 'var(--accent)', height: '3px' }} />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <div className="flex items-center justify-between">
            <SyncStatus />
            <div className="flex items-center gap-1">
              <button onClick={() => update('theme', settings.theme === 'dark' ? 'light' : 'dark')}
                title={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                style={{ color: 'var(--text-muted)', padding: '4px' }}
                onMouseEnter={event => event.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={event => event.currentTarget.style.color = 'var(--text-muted)'}>
                {settings.theme === 'dark'
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
                }
              </button>
              <button onClick={() => setShowExportImport(true)} title="Import / Export"
                style={{ color: 'var(--text-muted)', padding: '4px' }}
                onMouseEnter={event => event.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={event => event.currentTarget.style.color = 'var(--text-muted)'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </button>
              <button onClick={() => setShowSettings(true)} title="Settings"
                style={{ color: 'var(--text-muted)', padding: '4px' }}
                onMouseEnter={event => event.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={event => event.currentTarget.style.color = 'var(--text-muted)'}>
                <SettingsIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        {activeView.type === 'stats' ? (
          <StatsView physicalBooks={physicalBooks} webBooks={webBooks} />
        ) : activeView.type === 'history' ? (
          <ReadingHistoryView
            history={historyStore.history}
            loading={historyStore.loading}
            error={historyStore.error}
            page={historyPage}
            onPageChange={setHistoryPage}
            filters={historyFilters}
            onFiltersChange={setHistoryFilters}
            onAuthorClick={handleAuthorOpen}
            shelves={shelves}
            genres={historyGenres}
          />
        ) : activeView.type === 'author' ? (
          <AuthorView
            key={activeView.author}
            author={activeView.author}
            books={authorBooks}
            shelves={shelves}
            allBooks={allBooks}
            cardSize={settings.cardSize}
            updateBook={handleUpdateBook}
            deleteBook={handleDeleteBook}
            onBack={() => setActiveView(activeView.from || { type: 'shelf', shelfId: currentShelf.id })}
            onAuthorClick={handleAuthorOpen}
          />
        ) : (
          <CollectionView
            key={currentShelf.id}
            shelf={currentShelf}
            books={currentShelfBooks}
            loading={booksStore.loading}
            addBook={handleAddBook}
            updateBook={handleUpdateBook}
            deleteBook={handleDeleteBook}
            cardSize={settings.cardSize}
            allBooks={allBooks}
            shelves={shelves}
            onAuthorClick={handleAuthorOpen}
          />
        )}
      </div>

      {updateReady && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl px-5 py-4 flex items-center gap-4 fade-in"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div>
            <p className="font-display text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Update Ready</p>
            <p style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-muted)' }}>A new version is available</p>
          </div>
          <button onClick={() => window.api.installUpdate()}
            style={{ padding: '6px 14px', borderRadius: '6px', background: 'var(--accent)', color: '#0a0908', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: '500' }}>
            Install & Restart
          </button>
        </div>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showCreateShelf && (
        <ShelfModal
          existingShelves={shelves}
          onClose={() => setShowCreateShelf(false)}
          onCreate={handleCreateShelf}
        />
      )}
      {showExportImport && (
        <ExportImportModal
          onClose={() => setShowExportImport(false)}
          onExportCSV={() => {
            const slug = activeView.type === 'shelf' ? currentShelf.id : activeView.type
            exportCSV(selectedExportBooks, `library-${slug}-${new Date().toISOString().slice(0, 10)}.csv`)
            setShowExportImport(false)
          }}
          onExportOPML={() => {
            exportOPML(selectedExportBooks.filter(book => book.collection === 'web'), `library-feeds-${new Date().toISOString().slice(0, 10)}.opml`)
            setShowExportImport(false)
          }}
          onImport={() => {
            setShowExportImport(false)
            setShowImport(true)
          }}
        />
      )}
      {showImport && (
        <ImportModal
          shelves={shelves}
          defaultCollection={activeView.type === 'shelf' ? currentShelf.collection : 'physical'}
          defaultShelf={activeView.type === 'shelf' ? currentShelf.id : 'physical'}
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}
    </div>
  )
}
