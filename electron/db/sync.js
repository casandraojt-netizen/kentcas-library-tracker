const { getUnsyncedBooks, upsertBook, markSynced } = require('./local')

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
  // Always ensure latest columns exist — safe to run repeatedly
}

async function getPgClient() {
  if (pgClient) return pgClient

  // Check both process.env (from .env file) and the saved settings file
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
  } catch (err) { console.error('Neon connect error:', err.message); pgClient = null; return null }
}

async function ensureRemoteSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY, collection TEXT NOT NULL, title TEXT NOT NULL,
      author TEXT DEFAULT '', cover_url TEXT DEFAULT '', genre TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'unread', status_changed_at TIMESTAMPTZ,
      current_chapter TEXT DEFAULT '', total_chapters TEXT DEFAULT '',
      year INTEGER, is_favorite BOOLEAN DEFAULT FALSE, notes TEXT DEFAULT '',
      source_url TEXT DEFAULT '', web_type TEXT DEFAULT 'novel',
      rss_feed_url TEXT DEFAULT '', rss_last_item_title TEXT DEFAULT '',
      rss_has_update BOOLEAN DEFAULT FALSE, rss_last_checked TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL, deleted BOOLEAN DEFAULT FALSE
    );
  `)
}

async function syncUp(client) {
  const unsynced = getUnsyncedBooks()
  if (!unsynced.length) return 0
  for (const book of unsynced) {
    await client.query(`
      INSERT INTO books (id,collection,title,author,cover_url,genre,status,status_changed_at,current_chapter,total_chapters,year,is_favorite,notes,tags,is_r18,source_url,web_type,rss_feed_url,rss_last_item_title,rss_last_item_date,rss_has_update,rss_last_checked,created_at,updated_at,deleted)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
      ON CONFLICT(id) DO UPDATE SET
        title=EXCLUDED.title,author=EXCLUDED.author,cover_url=EXCLUDED.cover_url,genre=EXCLUDED.genre,
        status=EXCLUDED.status,status_changed_at=EXCLUDED.status_changed_at,current_chapter=EXCLUDED.current_chapter,
        total_chapters=EXCLUDED.total_chapters,year=EXCLUDED.year,is_favorite=EXCLUDED.is_favorite,
        notes=EXCLUDED.notes,tags=EXCLUDED.tags,is_r18=EXCLUDED.is_r18,source_url=EXCLUDED.source_url,web_type=EXCLUDED.web_type,
        rss_feed_url=EXCLUDED.rss_feed_url,rss_last_item_title=EXCLUDED.rss_last_item_title,
        rss_last_item_date=EXCLUDED.rss_last_item_date,rss_has_update=EXCLUDED.rss_has_update,
        rss_last_checked=EXCLUDED.rss_last_checked,
        updated_at=EXCLUDED.updated_at,deleted=EXCLUDED.deleted
      WHERE EXCLUDED.updated_at > books.updated_at
    `, [
      book.id,
      book.collection,
      book.title || '',
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
      book.rss_has_update ? true : false,
      book.rss_last_checked || null,
      book.created_at || new Date().toISOString(),
      book.updated_at || new Date().toISOString(),
      book.deleted ? true : false,
    ])
  }
  markSynced(unsynced.map(b => b.id))
  return unsynced.length
}

async function syncDown(client) {
  const since = lastSyncAt ? lastSyncAt.toISOString() : '1970-01-01T00:00:00Z'
  const res = await client.query('SELECT * FROM books WHERE updated_at > $1', [since])
  const { getBook } = require('./local')
  for (const row of res.rows) {
    const existing = getBook(row.id)
    // Explicitly map only known fields — never spread raw Neon row into SQLite
    // This prevents undefined/unknown columns from causing bind errors
    upsertBook({
      id: row.id,
      collection: row.collection,
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
      is_r18: row.is_r18 != null ? (row.is_r18 ? 1 : 0) : (existing?.is_r18 ? 1 : 0),
      source_url: row.source_url || '',
      web_type: row.web_type || 'novel',
      rss_feed_url: row.rss_feed_url || '',
      rss_last_item_title: row.rss_last_item_title || '',
      rss_last_item_date: row.rss_last_item_date ? new Date(row.rss_last_item_date).toISOString() : null,
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

let syncRunning = false
async function runSync() {
  if (syncRunning) return // prevent concurrent syncs
  syncRunning = true
  try { await _runSync() } finally { syncRunning = false }
}
async function _runSync() {
  const online = await checkConnectivity()
  if (!online) { if (isOnline) { isOnline = false; emit({ type: 'offline' }) } return }
  if (!isOnline) { isOnline = true; emit({ type: 'online' }) }
  const client = await getPgClient()
  if (!client) {
    // No URL configured at all — stay silent, not an error
    const hasUrl = !!(process.env.NEON_DATABASE_URL)
    if (hasUrl) emit({ type: 'error', message: 'Cannot connect to Neon. Check your URL in Settings.' })
    return
  }
  try {
    await runSchemaMigration(client)  // ensure is_r18 and other new columns exist
    emit({ type: 'syncing' })
    const pushed = await syncUp(client)
    const pulled = await syncDown(client)
    lastSyncAt = new Date()
    emit({ type: 'synced', pushed, pulled, at: lastSyncAt.toISOString() })
  } catch (err) { console.error('Sync error:', err.message, err.stack); pgClient = null; emit({ type: 'error', message: err.message }) }
}

function startAutoSync(intervalMs = 60000) { runSync(); return setInterval(runSync, intervalMs) }
function getSyncStatus() { return { isOnline, lastSyncAt: lastSyncAt ? lastSyncAt.toISOString() : null } }

module.exports = { runSync, startAutoSync, getSyncStatus, onSyncEvent }
