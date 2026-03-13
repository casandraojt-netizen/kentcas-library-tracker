const path = require('path')
const { app } = require('electron')

let db = null

function getDbPath() {
  return path.join(app.getPath('userData'), 'library.db')
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
      source_url TEXT DEFAULT '',
      web_type TEXT DEFAULT 'novel',
      rss_feed_url TEXT DEFAULT '',
      rss_last_item_title TEXT DEFAULT '',
      rss_has_update INTEGER DEFAULT 0,
      rss_last_checked TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_books_collection ON books(collection);
    CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
    CREATE INDEX IF NOT EXISTS idx_books_is_favorite ON books(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_books_synced ON books(synced);
  `)

  // Safe migrations
  const migrate = (sql) => { try { db.exec(sql) } catch (_) {} }
  migrate(`ALTER TABLE books ADD COLUMN status_changed_at TEXT`)
  migrate(`ALTER TABLE books ADD COLUMN web_type TEXT DEFAULT 'novel'`)
  migrate(`ALTER TABLE books ADD COLUMN rss_feed_url TEXT DEFAULT ''`)
  migrate(`ALTER TABLE books ADD COLUMN rss_last_item_title TEXT DEFAULT ''`)
  migrate(`ALTER TABLE books ADD COLUMN rss_has_update INTEGER DEFAULT 0`)
  migrate(`ALTER TABLE books ADD COLUMN rss_last_checked TEXT`)

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
  database.prepare(`
    INSERT INTO books (
      id, collection, title, author, cover_url, genre, status, status_changed_at,
      current_chapter, total_chapters, year, is_favorite, notes, source_url, web_type,
      rss_feed_url, rss_last_item_title, rss_has_update, rss_last_checked,
      created_at, updated_at, synced, deleted
    ) VALUES (
      @id, @collection, @title, @author, @cover_url, @genre, @status, @status_changed_at,
      @current_chapter, @total_chapters, @year, @is_favorite, @notes, @source_url, @web_type,
      @rss_feed_url, @rss_last_item_title, @rss_has_update, @rss_last_checked,
      @created_at, @updated_at, @synced, @deleted
    )
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title, author=excluded.author, cover_url=excluded.cover_url,
      genre=excluded.genre, status=excluded.status, status_changed_at=excluded.status_changed_at,
      current_chapter=excluded.current_chapter, total_chapters=excluded.total_chapters,
      year=excluded.year, is_favorite=excluded.is_favorite, notes=excluded.notes,
      source_url=excluded.source_url, web_type=excluded.web_type,
      rss_feed_url=excluded.rss_feed_url, rss_last_item_title=excluded.rss_last_item_title,
      rss_has_update=excluded.rss_has_update, rss_last_checked=excluded.rss_last_checked,
      updated_at=excluded.updated_at, synced=excluded.synced, deleted=excluded.deleted
  `).run({
    id: book.id,
    collection: book.collection,
    title: book.title || '',
    author: book.author || '',
    cover_url: book.cover_url || '',
    genre: book.genre || '',
    status: book.status || 'unread',
    status_changed_at: book.status_changed_at || now,
    current_chapter: book.current_chapter || '',
    total_chapters: book.total_chapters || '',
    year: book.year || null,
    is_favorite: book.is_favorite ? 1 : 0,
    notes: book.notes || '',
    source_url: book.source_url || '',
    web_type: book.web_type || 'novel',
    rss_feed_url: book.rss_feed_url || '',
    rss_last_item_title: book.rss_last_item_title || '',
    rss_has_update: book.rss_has_update ? 1 : 0,
    rss_last_checked: book.rss_last_checked || null,
    created_at: book.created_at || now,
    updated_at: book.updated_at || now,
    synced: book.synced ? 1 : 0,
    deleted: book.deleted ? 1 : 0,
  })
  return getBook(book.id)
}

function updateBook(id, updates) {
  const existing = getBook(id)
  if (!existing) throw new Error('Book not found: ' + id)
  const now = new Date().toISOString()
  const statusChanged = updates.status && updates.status !== existing.status
  const merged = {
    ...existing, ...updates,
    updated_at: now, synced: 0,
    status_changed_at: statusChanged ? now : (existing.status_changed_at || now),
  }
  return upsertBook(merged)
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

function getBooksWithRssFeed() {
  return getDb().prepare(`SELECT * FROM books WHERE rss_feed_url != '' AND rss_feed_url IS NOT NULL AND deleted = 0`).all().map(deserializeBook)
}

function markRssUpdate(id, latestTitle, hasUpdate) {
  const now = new Date().toISOString()
  getDb().prepare(`UPDATE books SET rss_has_update = ?, rss_last_item_title = ?, rss_last_checked = ?, synced = 0, updated_at = ? WHERE id = ?`)
    .run(hasUpdate ? 1 : 0, latestTitle, now, now, id)
}

function clearRssUpdate(id) {
  const now = new Date().toISOString()
  const book = getBook(id)
  if (!book) return
  getDb().prepare(`UPDATE books SET rss_has_update = 0, rss_last_checked = ?, synced = 0, updated_at = ? WHERE id = ?`)
    .run(now, now, id)
}

function deserializeBook(row) {
  return {
    ...row,
    is_favorite: row.is_favorite === 1,
    rss_has_update: row.rss_has_update === 1,
    synced: row.synced === 1,
    deleted: row.deleted === 1,
  }
}

module.exports = {
  initDb, getDb, getAllBooks, getBook, upsertBook, updateBook, deleteBook,
  getUnsyncedBooks, markSynced, getBooksWithRssFeed, markRssUpdate, clearRssUpdate
}
