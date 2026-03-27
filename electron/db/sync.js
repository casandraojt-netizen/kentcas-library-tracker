const {
  getUnsyncedBooks,
  upsertBook,
  markSynced,
  getUnsyncedHistoryEntries,
  markHistorySynced,
  upsertHistoryEntry,
} = require('./local')

let pgClient = null
let isOnline = false
let lastSyncAt = null
let syncListeners = []

function onSyncEvent(cb) { syncListeners.push(cb) }
function emit(event) { syncListeners.forEach(cb => cb(event)) }

async function checkConnectivity() {
  try { const dns = require('dns/promises'); await dns.lookup('google.com'); return true }
  catch { return false }
}

async function runSchemaMigration(client) {
  const statements = [
    `ALTER TABLE books ADD COLUMN shelf TEXT DEFAULT ''`,
    `ALTER TABLE books ADD COLUMN shelves TEXT DEFAULT '[]'`,
    `ALTER TABLE books ADD COLUMN tags TEXT DEFAULT ''`,
    `ALTER TABLE books ADD COLUMN is_r18 BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE books ADD COLUMN rss_last_item_date TIMESTAMPTZ`,
    `ALTER TABLE books ADD COLUMN rss_last_item_url TEXT DEFAULT ''`,
    `ALTER TABLE reading_history ADD COLUMN event_type TEXT DEFAULT 'status_changed'`,
    `ALTER TABLE reading_history ADD COLUMN from_status TEXT`,
    `ALTER TABLE reading_history ADD COLUMN to_status TEXT`,
    `ALTER TABLE reading_history ADD COLUMN from_chapter TEXT`,
    `ALTER TABLE reading_history ADD COLUMN to_chapter TEXT`,
    `ALTER TABLE reading_history ADD COLUMN event_at TIMESTAMPTZ`,
    `ALTER TABLE reading_history ADD COLUMN changed_at TIMESTAMPTZ`,
    `ALTER TABLE reading_history ADD COLUMN title TEXT DEFAULT ''`,
    `ALTER TABLE reading_history ADD COLUMN author TEXT DEFAULT ''`,
    `ALTER TABLE reading_history ADD COLUMN collection TEXT DEFAULT ''`,
    `ALTER TABLE reading_history ADD COLUMN genre TEXT DEFAULT ''`,
    `ALTER TABLE reading_history ADD COLUMN tags TEXT DEFAULT ''`,
    `ALTER TABLE reading_history ADD COLUMN cover_url TEXT DEFAULT ''`,
    `ALTER TABLE reading_history ADD COLUMN shelves_json TEXT DEFAULT '[]'`,
  ]
  for (const sql of statements) {
    try { await client.query(sql) } catch (_) {}
  }

  try {
    await client.query(`UPDATE reading_history SET event_type = 'status_changed' WHERE event_type IS NULL OR event_type = ''`)
    await client.query(`UPDATE reading_history SET event_at = COALESCE(event_at, changed_at, created_at) WHERE event_at IS NULL`)
  } catch (_) {}
}

async function getPgClient() {
  if (pgClient) return pgClient

  let connectionString = process.env.NEON_DATABASE_URL
  if (!connectionString) {
    try {
      const { app } = require('electron')
      const fs = require('fs')
      const path = require('path')
      const settingsPath = path.join(app.getPath('userData'), 'settings.json')
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
        if (settings.neonUrl) {
          connectionString = settings.neonUrl
          process.env.NEON_DATABASE_URL = connectionString
        }
      }
    } catch (_) {}
  }

  if (!connectionString) return null
  try {
    const { Client } = require('pg')
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 })
    await client.connect()
    await ensureRemoteSchema(client)
    pgClient = client
    return client
  } catch (err) {
    console.error('Neon connect error:', err.message)
    pgClient = null
    return null
  }
}

async function ensureRemoteSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      collection TEXT NOT NULL,
      title TEXT NOT NULL,
      shelf TEXT DEFAULT '',
      shelves TEXT DEFAULT '[]',
      author TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      genre TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'unread',
      status_changed_at TIMESTAMPTZ,
      current_chapter TEXT DEFAULT '',
      total_chapters TEXT DEFAULT '',
      year INTEGER,
      is_favorite BOOLEAN DEFAULT FALSE,
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      is_r18 BOOLEAN DEFAULT FALSE,
      source_url TEXT DEFAULT '',
      web_type TEXT DEFAULT 'novel',
      rss_feed_url TEXT DEFAULT '',
      rss_last_item_title TEXT DEFAULT '',
      rss_last_item_date TIMESTAMPTZ,
      rss_last_item_url TEXT DEFAULT '',
      rss_has_update BOOLEAN DEFAULT FALSE,
      rss_last_checked TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      deleted BOOLEAN DEFAULT FALSE
    );
  `)
  await client.query(`
    CREATE TABLE IF NOT EXISTS reading_history (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      event_type TEXT DEFAULT 'status_changed',
      from_status TEXT,
      to_status TEXT,
      from_chapter TEXT,
      to_chapter TEXT,
      event_at TIMESTAMPTZ,
      changed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      title TEXT DEFAULT '',
      author TEXT DEFAULT '',
      collection TEXT DEFAULT '',
      genre TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      shelves_json TEXT DEFAULT '[]'
    );
    CREATE INDEX IF NOT EXISTS idx_reading_history_book_id ON reading_history(book_id);
    CREATE INDEX IF NOT EXISTS idx_reading_history_event_at ON reading_history(event_at DESC);
  `)
}

async function syncUp(client) {
  const unsynced = getUnsyncedBooks()
  if (!unsynced.length) return 0
  for (const book of unsynced) {
    await client.query(`
      INSERT INTO books (
        id, collection, title, shelf, shelves, author, cover_url, genre, status, status_changed_at,
        current_chapter, total_chapters, year, is_favorite, notes, tags, is_r18, source_url,
        web_type, rss_feed_url, rss_last_item_title, rss_last_item_date, rss_last_item_url,
        rss_has_update, rss_last_checked, created_at, updated_at, deleted
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28
      )
      ON CONFLICT(id) DO UPDATE SET
        shelf=EXCLUDED.shelf,
        shelves=EXCLUDED.shelves,
        title=EXCLUDED.title,
        author=EXCLUDED.author,
        cover_url=EXCLUDED.cover_url,
        genre=EXCLUDED.genre,
        status=EXCLUDED.status,
        status_changed_at=EXCLUDED.status_changed_at,
        current_chapter=EXCLUDED.current_chapter,
        total_chapters=EXCLUDED.total_chapters,
        year=EXCLUDED.year,
        is_favorite=EXCLUDED.is_favorite,
        notes=EXCLUDED.notes,
        tags=EXCLUDED.tags,
        is_r18=EXCLUDED.is_r18,
        source_url=EXCLUDED.source_url,
        web_type=EXCLUDED.web_type,
        rss_feed_url=EXCLUDED.rss_feed_url,
        rss_last_item_title=EXCLUDED.rss_last_item_title,
        rss_last_item_date=EXCLUDED.rss_last_item_date,
        rss_last_item_url=EXCLUDED.rss_last_item_url,
        rss_has_update=EXCLUDED.rss_has_update,
        rss_last_checked=EXCLUDED.rss_last_checked,
        updated_at=EXCLUDED.updated_at,
        deleted=EXCLUDED.deleted
      WHERE EXCLUDED.updated_at > books.updated_at
    `, [
      book.id,
      book.collection,
      book.title || '',
      book.shelf || book.collection || 'physical',
      JSON.stringify(book.shelves || [book.shelf || book.collection || 'physical']),
      book.author || '',
      book.cover_url || '',
      book.genre || '',
      book.status || 'unread',
      book.status_changed_at || null,
      book.current_chapter || '',
      book.total_chapters || '',
      book.year || null,
      book.is_favorite ? true : false,
      book.notes || '',
      book.tags || '',
      book.is_r18 ? true : false,
      book.source_url || '',
      book.web_type || 'novel',
      book.rss_feed_url || '',
      book.rss_last_item_title || '',
      book.rss_last_item_date || null,
      book.rss_last_item_url || '',
      book.rss_has_update ? true : false,
      book.rss_last_checked || null,
      book.created_at || new Date().toISOString(),
      book.updated_at || new Date().toISOString(),
      book.deleted ? true : false,
    ])
  }
  markSynced(unsynced.map(book => book.id))
  return unsynced.length
}

async function syncUpHistory(client) {
  const unsynced = getUnsyncedHistoryEntries()
  if (!unsynced.length) return 0

  for (const entry of unsynced) {
    await client.query(`
      INSERT INTO reading_history (
        id, book_id, event_type, from_status, to_status, from_chapter, to_chapter,
        event_at, changed_at, created_at, title, author, collection, genre, tags, cover_url, shelves_json
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,$13,$14,$15,$16,$17
      )
      ON CONFLICT(id) DO UPDATE SET
        book_id=EXCLUDED.book_id,
        event_type=EXCLUDED.event_type,
        from_status=EXCLUDED.from_status,
        to_status=EXCLUDED.to_status,
        from_chapter=EXCLUDED.from_chapter,
        to_chapter=EXCLUDED.to_chapter,
        event_at=EXCLUDED.event_at,
        changed_at=EXCLUDED.changed_at,
        created_at=EXCLUDED.created_at,
        title=EXCLUDED.title,
        author=EXCLUDED.author,
        collection=EXCLUDED.collection,
        genre=EXCLUDED.genre,
        tags=EXCLUDED.tags,
        cover_url=EXCLUDED.cover_url,
        shelves_json=EXCLUDED.shelves_json
    `, [
      entry.id,
      entry.book_id,
      entry.event_type || 'status_changed',
      entry.from_status || null,
      entry.to_status || null,
      entry.from_chapter || null,
      entry.to_chapter || null,
      entry.event_at || entry.changed_at || entry.created_at || new Date().toISOString(),
      entry.changed_at || entry.event_at || entry.created_at || new Date().toISOString(),
      entry.created_at || new Date().toISOString(),
      entry.title || '',
      entry.author || '',
      entry.collection || 'physical',
      entry.genre || '',
      entry.tags || '',
      entry.cover_url || '',
      JSON.stringify(entry.shelves || [entry.collection || 'physical']),
    ])
  }

  markHistorySynced(unsynced.map(entry => entry.id))
  return unsynced.length
}

async function syncDown(client) {
  const since = lastSyncAt ? lastSyncAt.toISOString() : '1970-01-01T00:00:00Z'
  const res = await client.query('SELECT * FROM books WHERE updated_at > $1', [since])

  for (const row of res.rows) {
    upsertBook({
      id: row.id,
      collection: row.collection,
      shelf: row.shelf || row.collection,
      shelves: row.shelves || row.shelf || row.collection,
      title: row.title || '',
      author: row.author || '',
      cover_url: row.cover_url || '',
      genre: row.genre || '',
      status: row.status || 'unread',
      status_changed_at: row.status_changed_at ? new Date(row.status_changed_at).toISOString() : null,
      current_chapter: row.current_chapter || '',
      total_chapters: row.total_chapters || '',
      year: row.year || null,
      is_favorite: row.is_favorite ? 1 : 0,
      notes: row.notes || '',
      tags: row.tags || '',
      is_r18: row.is_r18 ? 1 : 0,
      source_url: row.source_url || '',
      web_type: row.web_type || 'novel',
      rss_feed_url: row.rss_feed_url || '',
      rss_last_item_title: row.rss_last_item_title || '',
      rss_last_item_date: row.rss_last_item_date ? new Date(row.rss_last_item_date).toISOString() : null,
      rss_last_item_url: row.rss_last_item_url || '',
      rss_has_update: row.rss_has_update ? 1 : 0,
      rss_last_checked: row.rss_last_checked ? new Date(row.rss_last_checked).toISOString() : null,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
      deleted: row.deleted ? 1 : 0,
      synced: 1,
    })
  }

  return res.rows.length
}

async function syncDownHistory(client) {
  const since = lastSyncAt ? lastSyncAt.toISOString() : '1970-01-01T00:00:00Z'
  const res = await client.query(`
    SELECT *
    FROM reading_history
    WHERE COALESCE(event_at, changed_at, created_at) > $1
    ORDER BY COALESCE(event_at, changed_at, created_at) ASC
  `, [since])

  for (const row of res.rows) {
    upsertHistoryEntry({
      id: row.id,
      book_id: row.book_id,
      event_type: row.event_type || 'status_changed',
      from_status: row.from_status,
      to_status: row.to_status,
      from_chapter: row.from_chapter,
      to_chapter: row.to_chapter,
      event_at: row.event_at ? new Date(row.event_at).toISOString() : null,
      changed_at: row.changed_at ? new Date(row.changed_at).toISOString() : null,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      title: row.title || '',
      author: row.author || '',
      collection: row.collection || 'physical',
      genre: row.genre || '',
      tags: row.tags || '',
      cover_url: row.cover_url || '',
      shelves_json: row.shelves_json || '[]',
    }, true)
  }

  return res.rows.length
}

let syncRunning = false
async function runSync() {
  if (syncRunning) return
  syncRunning = true
  try { await _runSync() } finally { syncRunning = false }
}

async function _runSync() {
  const online = await checkConnectivity()
  if (!online) {
    if (isOnline) {
      isOnline = false
      emit({ type: 'offline' })
    }
    return
  }

  if (!isOnline) {
    isOnline = true
    emit({ type: 'online' })
  }

  const client = await getPgClient()
  if (!client) {
    const hasUrl = !!process.env.NEON_DATABASE_URL
    if (hasUrl) emit({ type: 'error', message: 'Cannot connect to Neon. Check your URL in Settings.' })
    return
  }

  try {
    await runSchemaMigration(client)
    emit({ type: 'syncing' })
    const pushedBooks = await syncUp(client)
    const pushedHistory = await syncUpHistory(client)
    const pulledBooks = await syncDown(client)
    const pulledHistory = await syncDownHistory(client)
    lastSyncAt = new Date()
    emit({
      type: 'synced',
      pushed: pushedBooks + pushedHistory,
      pulled: pulledBooks + pulledHistory,
      pushedBooks,
      pushedHistory,
      pulledBooks,
      pulledHistory,
      at: lastSyncAt.toISOString(),
    })
  } catch (err) {
    console.error('Sync error:', err.message, err.stack)
    pgClient = null
    emit({ type: 'error', message: err.message })
  }
}

function startAutoSync(intervalMs = 60000) { runSync(); return setInterval(runSync, intervalMs) }
function getSyncStatus() { return { isOnline, lastSyncAt: lastSyncAt ? lastSyncAt.toISOString() : null } }

module.exports = { runSync, startAutoSync, getSyncStatus, onSyncEvent }
