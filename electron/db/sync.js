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

async function getPgClient() {
  if (pgClient) return pgClient
  const connectionString = process.env.NEON_DATABASE_URL
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
  const cols = ['status_changed_at TIMESTAMPTZ','web_type TEXT DEFAULT \'novel\'','rss_feed_url TEXT DEFAULT \'\'','rss_last_item_title TEXT DEFAULT \'\'','rss_has_update BOOLEAN DEFAULT FALSE','rss_last_checked TIMESTAMPTZ']
  for (const col of cols) { try { await client.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS ${col}`) } catch {} }
}

async function syncUp(client) {
  const unsynced = getUnsyncedBooks()
  if (!unsynced.length) return 0
  for (const book of unsynced) {
    await client.query(`
      INSERT INTO books (id,collection,title,author,cover_url,genre,status,status_changed_at,current_chapter,total_chapters,year,is_favorite,notes,source_url,web_type,rss_feed_url,rss_last_item_title,rss_has_update,rss_last_checked,created_at,updated_at,deleted)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      ON CONFLICT(id) DO UPDATE SET
        title=EXCLUDED.title,author=EXCLUDED.author,cover_url=EXCLUDED.cover_url,genre=EXCLUDED.genre,
        status=EXCLUDED.status,status_changed_at=EXCLUDED.status_changed_at,current_chapter=EXCLUDED.current_chapter,
        total_chapters=EXCLUDED.total_chapters,year=EXCLUDED.year,is_favorite=EXCLUDED.is_favorite,
        notes=EXCLUDED.notes,source_url=EXCLUDED.source_url,web_type=EXCLUDED.web_type,
        rss_feed_url=EXCLUDED.rss_feed_url,rss_last_item_title=EXCLUDED.rss_last_item_title,
        rss_has_update=EXCLUDED.rss_has_update,rss_last_checked=EXCLUDED.rss_last_checked,
        updated_at=EXCLUDED.updated_at,deleted=EXCLUDED.deleted
      WHERE EXCLUDED.updated_at > books.updated_at
    `, [book.id,book.collection,book.title,book.author,book.cover_url,book.genre,book.status,book.status_changed_at,book.current_chapter,book.total_chapters,book.year,book.is_favorite,book.notes,book.source_url,book.web_type||'novel',book.rss_feed_url||'',book.rss_last_item_title||'',book.rss_has_update,book.rss_last_checked||null,book.created_at,book.updated_at,book.deleted])
  }
  markSynced(unsynced.map(b => b.id))
  return unsynced.length
}

async function syncDown(client) {
  const since = lastSyncAt ? lastSyncAt.toISOString() : '1970-01-01T00:00:00Z'
  const res = await client.query('SELECT * FROM books WHERE updated_at > $1', [since])
  for (const row of res.rows) {
    upsertBook({
      ...row,
      is_favorite: row.is_favorite ? 1 : 0,
      rss_has_update: row.rss_has_update ? 1 : 0,
      deleted: row.deleted ? 1 : 0,
      synced: 1,
    })
  }
  return res.rows.length
}

async function runSync() {
  const online = await checkConnectivity()
  if (!online) { if (isOnline) { isOnline = false; emit({ type: 'offline' }) } return }
  if (!isOnline) { isOnline = true; emit({ type: 'online' }) }
  const client = await getPgClient()
  if (!client) { emit({ type: 'error', message: 'Cannot connect to Neon. Check NEON_DATABASE_URL in Settings.' }); return }
  try {
    emit({ type: 'syncing' })
    const pushed = await syncUp(client)
    const pulled = await syncDown(client)
    lastSyncAt = new Date()
    emit({ type: 'synced', pushed, pulled, at: lastSyncAt.toISOString() })
  } catch (err) { console.error('Sync error:', err.message); pgClient = null; emit({ type: 'error', message: err.message }) }
}

function startAutoSync(intervalMs = 60000) { runSync(); return setInterval(runSync, intervalMs) }
function getSyncStatus() { return { isOnline, lastSyncAt: lastSyncAt ? lastSyncAt.toISOString() : null } }

module.exports = { runSync, startAutoSync, getSyncStatus, onSyncEvent }
