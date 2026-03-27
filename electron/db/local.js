const path = require('path')
const { randomUUID } = require('crypto')
const { app } = require('electron')

let db = null
const HISTORY_PAGE_SIZE = 20

function getDbPath() {
  return path.join(app.getPath('userData'), 'library.db')
}

function createId() {
  return typeof randomUUID === 'function'
    ? randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function parseShelves(rawShelves, fallbackCollection = 'physical') {
  let shelves = []
  if (Array.isArray(rawShelves)) {
    shelves = rawShelves
  } else if (typeof rawShelves === 'string' && rawShelves.trim()) {
    const trimmed = rawShelves.trim()
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) shelves = parsed
      } catch (_) {}
    } else if (trimmed.includes('|')) {
      shelves = trimmed.split('|')
    } else {
      shelves = [trimmed]
    }
  }

  const normalized = shelves
    .map(value => String(value || '').trim())
    .filter(Boolean)

  const unique = [...new Set(normalized.filter(value => value !== fallbackCollection))]
  return [fallbackCollection, ...unique]
}

function normalizeBook(book) {
  const collection = book.collection === 'web' ? 'web' : 'physical'
  const shelves = parseShelves(book.shelves ?? book.shelf ?? book.collection, collection)
  return {
    ...book,
    collection,
    shelf: shelves[0],
    shelves,
  }
}

function initDb() {
  const Database = require('better-sqlite3')
  db = new Database(getDbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      collection TEXT NOT NULL CHECK(collection IN ('physical', 'web')),
      shelf TEXT DEFAULT '',
      shelves TEXT DEFAULT '[]',
      title TEXT NOT NULL,
      author TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      genre TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'unread',
      status_changed_at TEXT,
      current_chapter TEXT DEFAULT '',
      total_chapters TEXT DEFAULT '',
      year INTEGER,
      is_favorite INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      is_r18 INTEGER DEFAULT 0,
      source_url TEXT DEFAULT '',
      web_type TEXT DEFAULT 'novel',
      rss_feed_url TEXT DEFAULT '',
      rss_last_item_title TEXT DEFAULT '',
      rss_last_item_date TEXT,
      rss_last_item_url TEXT DEFAULT '',
      rss_has_update INTEGER DEFAULT 0,
      rss_last_checked TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS reading_history (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      event_type TEXT DEFAULT 'status_changed',
      from_status TEXT,
      to_status TEXT,
      from_chapter TEXT,
      to_chapter TEXT,
      event_at TEXT,
      changed_at TEXT,
      created_at TEXT NOT NULL,
      title TEXT DEFAULT '',
      author TEXT DEFAULT '',
      collection TEXT DEFAULT '',
      genre TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      shelves_json TEXT DEFAULT '[]',
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_books_collection ON books(collection);
    CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
    CREATE INDEX IF NOT EXISTS idx_books_is_favorite ON books(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_books_synced ON books(synced);
  `)

  const migrate = (sql) => { try { db.exec(sql) } catch (_) {} }
  migrate(`ALTER TABLE books ADD COLUMN shelf TEXT DEFAULT ''`)
  migrate(`ALTER TABLE books ADD COLUMN shelves TEXT DEFAULT '[]'`)
  migrate(`ALTER TABLE books ADD COLUMN status_changed_at TEXT`)
  migrate(`ALTER TABLE books ADD COLUMN web_type TEXT DEFAULT 'novel'`)
  migrate(`ALTER TABLE books ADD COLUMN rss_feed_url TEXT DEFAULT ''`)
  migrate(`ALTER TABLE books ADD COLUMN rss_last_item_title TEXT DEFAULT ''`)
  migrate(`ALTER TABLE books ADD COLUMN rss_has_update INTEGER DEFAULT 0`)
  migrate(`ALTER TABLE books ADD COLUMN rss_last_checked TEXT`)
  migrate(`ALTER TABLE books ADD COLUMN rss_last_item_date TEXT`)
  migrate(`ALTER TABLE books ADD COLUMN rss_last_item_url TEXT DEFAULT ''`)
  migrate(`ALTER TABLE books ADD COLUMN is_r18 INTEGER DEFAULT 0`)
  migrate(`ALTER TABLE books ADD COLUMN tags TEXT DEFAULT ''`)
  migrate(`
    CREATE TABLE IF NOT EXISTS reading_history (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      event_type TEXT DEFAULT 'status_changed',
      from_status TEXT,
      to_status TEXT,
      from_chapter TEXT,
      to_chapter TEXT,
      event_at TEXT,
      changed_at TEXT,
      created_at TEXT NOT NULL,
      title TEXT DEFAULT '',
      author TEXT DEFAULT '',
      collection TEXT DEFAULT '',
      genre TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      shelves_json TEXT DEFAULT '[]',
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )
  `)
  migrate(`ALTER TABLE reading_history ADD COLUMN event_type TEXT DEFAULT 'status_changed'`)
  migrate(`ALTER TABLE reading_history ADD COLUMN from_chapter TEXT`)
  migrate(`ALTER TABLE reading_history ADD COLUMN to_chapter TEXT`)
  migrate(`ALTER TABLE reading_history ADD COLUMN event_at TEXT`)
  migrate(`ALTER TABLE reading_history ADD COLUMN title TEXT DEFAULT ''`)
  migrate(`ALTER TABLE reading_history ADD COLUMN author TEXT DEFAULT ''`)
  migrate(`ALTER TABLE reading_history ADD COLUMN collection TEXT DEFAULT ''`)
  migrate(`ALTER TABLE reading_history ADD COLUMN genre TEXT DEFAULT ''`)
  migrate(`ALTER TABLE reading_history ADD COLUMN tags TEXT DEFAULT ''`)
  migrate(`ALTER TABLE reading_history ADD COLUMN cover_url TEXT DEFAULT ''`)
  migrate(`ALTER TABLE reading_history ADD COLUMN shelves_json TEXT DEFAULT '[]'`)
  migrate(`ALTER TABLE reading_history ADD COLUMN synced INTEGER DEFAULT 0`)
  migrate(`CREATE INDEX IF NOT EXISTS idx_books_shelf ON books(shelf)`)
  migrate(`CREATE INDEX IF NOT EXISTS idx_reading_history_event_at ON reading_history(event_at DESC)`)
  migrate(`CREATE INDEX IF NOT EXISTS idx_reading_history_book_id ON reading_history(book_id)`)
  migrate(`CREATE INDEX IF NOT EXISTS idx_reading_history_event_type ON reading_history(event_type)`)

  db.prepare(`UPDATE books SET shelf = collection WHERE shelf IS NULL OR shelf = ''`).run()
  db.prepare(`UPDATE reading_history SET event_type = 'status_changed' WHERE event_type IS NULL OR event_type = ''`).run()
  db.prepare(`UPDATE reading_history SET event_at = COALESCE(event_at, changed_at, created_at) WHERE event_at IS NULL OR event_at = ''`).run()
  db.prepare(`UPDATE reading_history SET synced = 0 WHERE synced IS NULL`).run()

  const rows = db.prepare(`SELECT id, collection, shelf, shelves FROM books`).all()
  const updateShelvesStmt = db.prepare(`UPDATE books SET shelf = ?, shelves = ? WHERE id = ?`)
  const migrateShelves = db.transaction((items) => {
    for (const row of items) {
      const shelves = parseShelves(row.shelves, row.shelf || row.collection)
      updateShelvesStmt.run(shelves[0], JSON.stringify(shelves), row.id)
    }
  })
  migrateShelves(rows)

  console.log('SQLite DB ready:', getDbPath())
  return db
}

function getDb() {
  if (!db) initDb()
  return db
}

function getAllBooks(collection) {
  const database = getDb()
  const rows = collection
    ? database.prepare('SELECT * FROM books WHERE collection = ? AND deleted = 0 ORDER BY updated_at DESC').all(collection)
    : database.prepare('SELECT * FROM books WHERE deleted = 0 ORDER BY updated_at DESC').all()
  return rows.map(deserializeBook)
}

function getBook(id) {
  const row = getDb().prepare('SELECT * FROM books WHERE id = ?').get(id)
  return row ? deserializeBook(row) : null
}

function upsertBook(book) {
  const database = getDb()
  const now = new Date().toISOString()
  const normalized = normalizeBook(book)

  database.prepare(`
    INSERT INTO books (
      id, collection, shelf, shelves, title, author, cover_url, genre, status, status_changed_at,
      current_chapter, total_chapters, year, is_favorite, notes, tags, is_r18, source_url, web_type,
      rss_feed_url, rss_last_item_title, rss_last_item_date, rss_last_item_url, rss_has_update, rss_last_checked,
      created_at, updated_at, synced, deleted
    ) VALUES (
      @id, @collection, @shelf, @shelves, @title, @author, @cover_url, @genre, @status, @status_changed_at,
      @current_chapter, @total_chapters, @year, @is_favorite, @notes, @tags, @is_r18, @source_url, @web_type,
      @rss_feed_url, @rss_last_item_title, @rss_last_item_date, @rss_last_item_url, @rss_has_update, @rss_last_checked,
      @created_at, @updated_at, @synced, @deleted
    )
    ON CONFLICT(id) DO UPDATE SET
      shelf=excluded.shelf,
      shelves=excluded.shelves,
      title=excluded.title,
      author=excluded.author,
      cover_url=excluded.cover_url,
      genre=excluded.genre,
      status=excluded.status,
      status_changed_at=excluded.status_changed_at,
      current_chapter=excluded.current_chapter,
      total_chapters=excluded.total_chapters,
      year=excluded.year,
      is_favorite=excluded.is_favorite,
      notes=excluded.notes,
      tags=excluded.tags,
      is_r18=excluded.is_r18,
      source_url=excluded.source_url,
      web_type=excluded.web_type,
      rss_feed_url=excluded.rss_feed_url,
      rss_last_item_title=excluded.rss_last_item_title,
      rss_last_item_date=excluded.rss_last_item_date,
      rss_last_item_url=excluded.rss_last_item_url,
      rss_has_update=excluded.rss_has_update,
      rss_last_checked=excluded.rss_last_checked,
      updated_at=excluded.updated_at,
      synced=excluded.synced,
      deleted=excluded.deleted
  `).run({
    id: normalized.id,
    collection: normalized.collection,
    shelf: normalized.shelf,
    shelves: JSON.stringify(normalized.shelves),
    title: normalized.title || '',
    author: normalized.author || '',
    cover_url: normalized.cover_url || '',
    genre: normalized.genre || '',
    status: normalized.status || 'unread',
    status_changed_at: normalized.status_changed_at || now,
    current_chapter: normalized.current_chapter || '',
    total_chapters: normalized.total_chapters || '',
    year: normalized.year || null,
    is_favorite: normalized.is_favorite ? 1 : 0,
    notes: normalized.notes || '',
    tags: normalized.tags || '',
    is_r18: normalized.is_r18 ? 1 : 0,
    source_url: normalized.source_url || '',
    web_type: normalized.web_type || 'novel',
    rss_feed_url: normalized.rss_feed_url || '',
    rss_last_item_title: normalized.rss_last_item_title || '',
    rss_last_item_date: normalized.rss_last_item_date || null,
    rss_last_item_url: normalized.rss_last_item_url || '',
    rss_has_update: normalized.rss_has_update ? 1 : 0,
    rss_last_checked: normalized.rss_last_checked || null,
    created_at: normalized.created_at || now,
    updated_at: normalized.updated_at || now,
    synced: normalized.synced ? 1 : 0,
    deleted: normalized.deleted ? 1 : 0,
  })

  return getBook(normalized.id)
}

function createHistoryEntry({ book, eventType, fromStatus = null, toStatus = null, fromChapter = null, toChapter = null, eventAt = null }) {
  const database = getDb()
  const normalized = normalizeBook(book)
  const timestamp = eventAt || normalized.updated_at || new Date().toISOString()
  database.prepare(`
    INSERT INTO reading_history (
      id, book_id, event_type, from_status, to_status, from_chapter, to_chapter,
      event_at, changed_at, created_at, title, author, collection, genre, tags, cover_url, shelves_json, synced
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    createId(),
    normalized.id,
    eventType,
    fromStatus,
    toStatus,
    fromChapter,
    toChapter,
    timestamp,
    timestamp,
    new Date().toISOString(),
    normalized.title || '',
    normalized.author || '',
    normalized.collection,
    normalized.genre || '',
    normalized.tags || '',
    normalized.cover_url || '',
    JSON.stringify(normalized.shelves),
    0
  )
}

function recordCreateHistory(book, eventAt) {
  createHistoryEntry({
    book,
    eventType: 'created',
    toStatus: book.status || 'unread',
    toChapter: book.current_chapter || '',
    eventAt: eventAt || book.created_at || book.updated_at,
  })
}

function recordStatusHistory(book, fromStatus, toStatus, eventAt) {
  createHistoryEntry({
    book,
    eventType: 'status_changed',
    fromStatus,
    toStatus,
    fromChapter: book.current_chapter || '',
    toChapter: book.current_chapter || '',
    eventAt: eventAt || book.status_changed_at || book.updated_at,
  })
}

function recordChapterHistory(book, fromChapter, toChapter, eventAt) {
  createHistoryEntry({
    book,
    eventType: 'chapter_progress',
    fromStatus: book.status || 'unread',
    toStatus: book.status || 'unread',
    fromChapter,
    toChapter,
    eventAt: eventAt || book.updated_at,
  })
}

function recordBookChanges(previous, next) {
  if (!previous || !next || next.deleted) return
  if ((previous.status || 'unread') !== (next.status || 'unread')) {
    recordStatusHistory(next, previous.status || 'unread', next.status || 'unread', next.status_changed_at || next.updated_at)
  }
  if ((previous.current_chapter || '') !== (next.current_chapter || '')) {
    recordChapterHistory(next, previous.current_chapter || '', next.current_chapter || '', next.updated_at)
  }
}

function updateBook(id, updates) {
  const existing = getBook(id)
  if (!existing) throw new Error('Book not found: ' + id)
  const now = new Date().toISOString()
  const normalizedUpdates = normalizeBook({ ...existing, ...updates })
  const statusChanged = normalizedUpdates.status && normalizedUpdates.status !== existing.status
  const merged = {
    ...existing,
    ...normalizedUpdates,
    updated_at: now,
    synced: 0,
    status_changed_at: statusChanged ? now : (existing.status_changed_at || now),
  }
  return upsertBook(merged)
}

function buildHistoryFilter(filters = {}, params = [], includeRecentCutoff = false, cutoff = null) {
  const clauses = ['1 = 1']
  if (filters.search?.trim()) {
    clauses.push('(LOWER(title) LIKE ? OR LOWER(author) LIKE ?)')
    const query = `%${filters.search.trim().toLowerCase()}%`
    params.push(query, query)
  }
  if (filters.bookId) {
    clauses.push('book_id = ?')
    params.push(filters.bookId)
  }
  if (filters.collection) {
    clauses.push('collection = ?')
    params.push(filters.collection)
  }
  if (filters.genre) {
    clauses.push('genre = ?')
    params.push(filters.genre)
  }
  if (filters.tag?.trim()) {
    clauses.push('LOWER(tags) LIKE ?')
    params.push(`%${filters.tag.trim().toLowerCase()}%`)
  }
  if (filters.shelf) {
    clauses.push('shelves_json LIKE ?')
    params.push(`%"${filters.shelf.replace(/"/g, '""')}%"`)
  }
  if (filters.eventTypes?.length) {
    clauses.push(`event_type IN (${filters.eventTypes.map(() => '?').join(', ')})`)
    params.push(...filters.eventTypes)
  }
  if (includeRecentCutoff && cutoff) {
    clauses.push('event_at >= ?')
    params.push(cutoff)
  }
  return clauses.join(' AND ')
}

function getReadingHistory(page = 1, pageSize = HISTORY_PAGE_SIZE, filters = {}) {
  const database = getDb()
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.max(1, Number(pageSize) || HISTORY_PAGE_SIZE)
  const baseParams = []
  const baseWhere = buildHistoryFilter(filters, baseParams)

  const rawCount = database.prepare(`SELECT COUNT(*) AS count FROM reading_history WHERE ${baseWhere}`).get(...baseParams).count
  const shouldTruncate = !filters.showAll && rawCount > safePageSize * 5
  const cutoff = shouldTruncate ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() : null

  const filteredParams = []
  const filteredWhere = buildHistoryFilter(filters, filteredParams, shouldTruncate, cutoff)
  const totalCount = database.prepare(`SELECT COUNT(*) AS count FROM reading_history WHERE ${filteredWhere}`).get(...filteredParams).count
  const offset = (safePage - 1) * safePageSize

  const rows = database.prepare(`
    SELECT *
    FROM reading_history
    WHERE ${filteredWhere}
    ORDER BY event_at DESC, created_at DESC
    LIMIT ? OFFSET ?
  `).all(...filteredParams, safePageSize, offset)

  return {
    entries: rows.map(deserializeHistoryEntry),
    page: safePage,
    pageSize: safePageSize,
    totalCount,
    rawCount,
    totalPages: Math.max(1, Math.ceil(totalCount / safePageSize)),
    truncatedToRecent: shouldTruncate,
    cutoff,
  }
}

function deleteBook(id) {
  const now = new Date().toISOString()
  getDb().prepare('UPDATE books SET deleted = 1, updated_at = ?, synced = 0 WHERE id = ?').run(now, id)
  return { success: true }
}

function getUnsyncedBooks() {
  return getDb().prepare('SELECT * FROM books WHERE synced = 0').all().map(deserializeBook)
}

function markSynced(ids) {
  const stmt = getDb().prepare('UPDATE books SET synced = 1 WHERE id = ?')
  const tx = getDb().transaction((list) => { for (const id of list) stmt.run(id) })
  tx(ids)
}

function upsertHistoryEntry(entry, synced = true) {
  const database = getDb()
  const collection = entry.collection === 'web' ? 'web' : 'physical'
  const shelves = parseShelves(entry.shelves ?? entry.shelves_json, collection)
  database.prepare(`
    INSERT INTO reading_history (
      id, book_id, event_type, from_status, to_status, from_chapter, to_chapter,
      event_at, changed_at, created_at, title, author, collection, genre, tags, cover_url, shelves_json, synced
    )
    VALUES (
      @id, @book_id, @event_type, @from_status, @to_status, @from_chapter, @to_chapter,
      @event_at, @changed_at, @created_at, @title, @author, @collection, @genre, @tags, @cover_url, @shelves_json, @synced
    )
    ON CONFLICT(id) DO UPDATE SET
      book_id=excluded.book_id,
      event_type=excluded.event_type,
      from_status=excluded.from_status,
      to_status=excluded.to_status,
      from_chapter=excluded.from_chapter,
      to_chapter=excluded.to_chapter,
      event_at=excluded.event_at,
      changed_at=excluded.changed_at,
      created_at=excluded.created_at,
      title=excluded.title,
      author=excluded.author,
      collection=excluded.collection,
      genre=excluded.genre,
      tags=excluded.tags,
      cover_url=excluded.cover_url,
      shelves_json=excluded.shelves_json,
      synced=excluded.synced
  `).run({
    id: entry.id,
    book_id: entry.book_id,
    event_type: entry.event_type || 'status_changed',
    from_status: entry.from_status || null,
    to_status: entry.to_status || null,
    from_chapter: entry.from_chapter || null,
    to_chapter: entry.to_chapter || null,
    event_at: entry.event_at || entry.changed_at || entry.created_at || new Date().toISOString(),
    changed_at: entry.changed_at || entry.event_at || entry.created_at || new Date().toISOString(),
    created_at: entry.created_at || new Date().toISOString(),
    title: entry.title || '',
    author: entry.author || '',
    collection,
    genre: entry.genre || '',
    tags: entry.tags || '',
    cover_url: entry.cover_url || '',
    shelves_json: JSON.stringify(shelves),
    synced: synced ? 1 : 0,
  })
}

function getUnsyncedHistoryEntries() {
  return getDb().prepare('SELECT * FROM reading_history WHERE synced = 0 ORDER BY created_at ASC').all().map(deserializeHistoryEntry)
}

function markHistorySynced(ids) {
  if (!ids?.length) return
  const stmt = getDb().prepare('UPDATE reading_history SET synced = 1 WHERE id = ?')
  const tx = getDb().transaction((list) => { for (const id of list) stmt.run(id) })
  tx(ids)
}

function getBooksWithRssFeed() {
  return getDb().prepare(`SELECT * FROM books WHERE rss_feed_url != '' AND rss_feed_url IS NOT NULL AND deleted = 0`).all().map(deserializeBook)
}

function markRssUpdate(id, latestTitle, hasUpdate, latestDate, latestUrl) {
  const now = new Date().toISOString()
  const result = getDb().prepare(`
    UPDATE books
    SET rss_has_update = ?, rss_last_item_title = ?, rss_last_item_date = ?, rss_last_item_url = ?, rss_last_checked = ?, synced = 0, updated_at = ?
    WHERE id = ?
  `).run(hasUpdate ? 1 : 0, latestTitle, latestDate || null, latestUrl || '', now, now, id)
  if (result.changes === 0) {
    console.warn(`[markRssUpdate] No rows updated for id: ${id} - book may not exist in SQLite`)
  } else {
    console.log(`[markRssUpdate] Updated "${latestTitle}" date=${latestDate} changes=${result.changes}`)
  }
}

function clearRssUpdate(id) {
  const now = new Date().toISOString()
  const book = getBook(id)
  if (!book) return
  getDb().prepare(`UPDATE books SET rss_has_update = 0, rss_last_checked = ?, synced = 0, updated_at = ? WHERE id = ?`)
    .run(now, now, id)
}

function deserializeBook(row) {
  const shelves = parseShelves(row.shelves, row.shelf || row.collection)
  return {
    ...row,
    shelf: shelves[0],
    shelves,
    is_favorite: row.is_favorite === 1,
    is_r18: row.is_r18 === 1,
    rss_has_update: row.rss_has_update === 1,
    synced: row.synced === 1,
    deleted: row.deleted === 1,
  }
}

function deserializeHistoryEntry(row) {
  const shelves = parseShelves(row.shelves_json, row.collection || 'physical')
  return {
    ...row,
    event_type: row.event_type || 'status_changed',
    event_at: row.event_at || row.changed_at || row.created_at,
    shelf: shelves[0],
    shelves,
    synced: row.synced === 1,
  }
}

module.exports = {
  initDb,
  getDb,
  getAllBooks,
  getBook,
  upsertBook,
  updateBook,
  deleteBook,
  getUnsyncedBooks,
  markSynced,
  getUnsyncedHistoryEntries,
  markHistorySynced,
  upsertHistoryEntry,
  getBooksWithRssFeed,
  markRssUpdate,
  clearRssUpdate,
  recordCreateHistory,
  recordStatusHistory,
  recordChapterHistory,
  recordBookChanges,
  getReadingHistory,
  parseShelves,
}
