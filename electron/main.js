const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, Notification } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.argv.includes('--dev')

// Load .env
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...rest] = trimmed.split('=')
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
    }
  }
}

const localDb = require('./db/local')
const sync = require('./db/sync')
const rss = require('./rss')
const { searchForums } = require('./scraper')

// Prevent connection drops from crashing the whole app
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (handled):', err.message)
})
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection (handled):', reason?.message || reason)
})

let mainWindow = null
let tray = null
let syncInterval = null
let rssInterval = null
let isQuitting = false

// ── Tray icon ──────────────────────────────────────────────────────────────────
function getTrayIcon() {
  // On Windows use .ico which has multiple sizes built in — tray will pick the right one
  if (process.platform === 'win32') {
    const icoPath = path.join(__dirname, '..', 'public', 'icon.ico')
    if (fs.existsSync(icoPath)) {
      return nativeImage.createFromPath(icoPath)
    }
  }
  // Fallback to PNG and resize for tray
  const iconPath = path.join(__dirname, '..', 'public', 'icon.png')
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  }
  return nativeImage.createEmpty()
}

function createTray() {
  if (tray) { tray.destroy(); tray = null }
  tray = new Tray(getTrayIcon())
  tray.setToolTip('Library Tracker')
  updateTrayMenu()
  tray.on('double-click', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus() }
  })

}

function updateTrayMenu() {
  if (!tray) return
  const menu = Menu.buildFromTemplate([
    { label: 'Open Library Tracker', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus() } } },
    { label: 'Check RSS feeds now', click: () => rss.checkAllFeeds() },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit() } },
  ])
  tray.setContextMenu(menu)
}

// ── Window ─────────────────────────────────────────────────────────────────────
function createWindow() {
  const appIconPath = path.join(__dirname, '..', 'public', 'icon.png')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    backgroundColor: '#0f0e0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  })

  // Allow iframes to load external forum pages
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src * 'unsafe-inline' 'unsafe-eval' data: blob:"]
      }
    })
  })

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── App lifecycle ──────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  localDb.initDb()

  sync.onSyncEvent((event) => {
    if (mainWindow) mainWindow.webContents.send('sync:update', event)
  })

  rss.onRssEvent((event) => {
    if (mainWindow) mainWindow.webContents.send('rss:update', event)
    if (event.type === 'update' && Notification.isSupported()) {
      new Notification({
        title: 'New Chapter Available',
        body: `${event.bookTitle}: ${event.latestTitle}`,
        icon: path.join(__dirname, '..', 'public', 'icon.png'),
      }).show()
    }
  })

  syncInterval = sync.startAutoSync(60000)
  rssInterval = rss.startRssPoller() // returns [activeInterval, inactiveInterval]

  createWindow()
  createTray()

  // Auto-updater (only in production)
  if (!isDev) {
    try {
      const { autoUpdater } = require('electron-updater')
      autoUpdater.checkForUpdatesAndNotify()
      autoUpdater.on('update-downloaded', () => {
        if (mainWindow) mainWindow.webContents.send('app:update-ready')
      })
    } catch (e) {
      console.log('Auto-updater not configured:', e.message)
    }
  }

  app.on('activate', () => { if (!mainWindow) createWindow() })
})

app.on('before-quit', () => {
  isQuitting = true
  if (tray) { tray.destroy(); tray = null }
})
app.on('window-all-closed', () => {
  if (syncInterval) clearInterval(syncInterval)
  if (rssInterval) {
    if (Array.isArray(rssInterval)) rssInterval.forEach(clearInterval)
    else clearInterval(rssInterval)
  }
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC: Books ─────────────────────────────────────────────────────────────────
ipcMain.handle('db:getBooks', async (_, collection) => {
  try { return { success: true, data: localDb.getAllBooks(collection) }
  } catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('db:addBook', async (_, book) => {
  try {
    const { v4: uuidv4 } = require('uuid')
    const now = new Date().toISOString()
    const newBook = { ...book, id: book.id || uuidv4(), created_at: now, updated_at: now, synced: false }
    const saved = localDb.upsertBook(newBook)
    sync.runSync()
    return { success: true, data: saved }
  } catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('db:updateBook', async (_, id, updates) => {
  try {
    console.log('[updateBook] id:', id, 'is_r18 in updates:', updates.is_r18, 'type:', typeof updates.is_r18)
    const saved = localDb.updateBook(id, updates)
    console.log('[updateBook] saved is_r18:', saved.is_r18)
    sync.runSync()
    return { success: true, data: saved }
  } catch (e) { console.error('[updateBook] error:', e.message); return { success: false, error: e.message } }
})

ipcMain.handle('db:deleteBook', async (_, id) => {
  try { localDb.deleteBook(id); sync.runSync(); return { success: true }
  } catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('db:importBooks', async (_, books) => {
  try {
    const { v4: uuidv4 } = require('uuid')
    const now = new Date().toISOString()
    let count = 0
    for (const book of books) {
      localDb.upsertBook({ ...book, id: book.id || uuidv4(), created_at: now, updated_at: now, synced: false })
      count++
    }
    sync.runSync()
    return { success: true, count }
  } catch (e) { return { success: false, error: e.message } }
})

// ── IPC: RSS ───────────────────────────────────────────────────────────────────
ipcMain.handle('rss:checkNow', async () => {
  await rss.checkAllFeeds()
  return { success: true }
})

ipcMain.handle('rss:clearUpdate', async (_, id) => {
  try { localDb.clearRssUpdate(id); return { success: true }
  } catch (e) { return { success: false, error: e.message } }
})

// ── IPC: Sync ──────────────────────────────────────────────────────────────────
ipcMain.handle('sync:status', async () => sync.getSyncStatus())
ipcMain.handle('sync:trigger', async () => { await sync.runSync(); return sync.getSyncStatus() })

// ── IPC: Settings ──────────────────────────────────────────────────────────────
ipcMain.handle('settings:get', async () => {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json')
  if (fs.existsSync(settingsPath)) return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
  return {}
})

ipcMain.handle('settings:save', async (_, settings) => {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json')
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  if (settings.neonUrl) process.env.NEON_DATABASE_URL = settings.neonUrl
  return { success: true }
})

// ── IPC: App ───────────────────────────────────────────────────────────────────
ipcMain.handle('app:installUpdate', () => {
  const { autoUpdater } = require('electron-updater')
  autoUpdater.quitAndInstall()
})

ipcMain.handle('app:openExternal', (_, url) => shell.openExternal(url))

// ── IPC: RSS fetch (main process to avoid CORS) ───────────────────────────────
ipcMain.handle('rss:fetch', async (_, feedUrl) => {
  // Fetch the raw XML ourselves so we control headers, then parse the string
  const https = require('https')
  const http = require('http')

  function fetchRaw(url, redirectCount = 0) {
    return new Promise((resolve, reject) => {
      if (redirectCount > 5) { reject(new Error('Too many redirects')); return }
      const mod = url.startsWith('https') ? https : http
      const req = mod.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.9',
          // Never send conditional headers — we always want the full feed
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        timeout: 15000,
      }, (res) => {
        // Follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchRaw(res.headers.location, redirectCount + 1).then(resolve).catch(reject)
        }
        let data = ''
        res.setEncoding('utf8')
        res.on('data', c => data += c)
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out after 15s')) })
    })
  }

  try {
    // Fetch raw XML — retry with cache-bust if we get a 304
    let { status, body } = await fetchRaw(feedUrl)
    if (status === 304 || !body || body.length < 50) {
      const bustUrl = feedUrl + (feedUrl.includes('?') ? '&' : '?') + '_t=' + Date.now()
      const retry = await fetchRaw(bustUrl)
      status = retry.status
      body = retry.body
    }
    if (!body || body.length < 50) {
      return { success: false, error: 'Server returned no content (status ' + status + '). Try again in a moment.', items: [] }
    }

    // If it looks like HTML (error page), report it clearly
    if (body.trimStart().startsWith('<!DOCTYPE') || body.trimStart().startsWith('<html')) {
      return { success: false, error: 'Server returned an HTML page instead of RSS. The URL may be wrong or rate-limited.', items: [] }
    }

    const Parser = require('rss-parser')
    // Try strategies from most to least lenient — SpaceBattles uses custom XML namespaces
    // that strict parsers reject. The third strategy (strict:true) is the one that works.
    const strategies = [
      { xml2js: { strict: true } },
      { xml2js: { strict: false, normalize: true, normalizeTags: false } },
      { xml2js: { strict: false, normalize: false, normalizeTags: false } },
    ]
    let lastErr = null
    for (const opts of strategies) {
      try {
        const parser = new Parser({
          ...opts,
          customFields: { item: [['content:encoded', 'contentEncoded'], ['dc:creator', 'creator'], ['threadmarks:words', 'words'], ['threadmarks:likes', 'likes']] },
        })
        const feed = await parser.parseString(body)
        return {
          success: true,
          title: feed.title || '',
          items: (feed.items || []).map(item => ({
            title: item.title || '',
            link: item.link || item.guid || '',
            pubDate: item.pubDate || item.isoDate || '',
            isoDate: item.isoDate || '',
            contentSnippet: item.contentSnippet || item.summary || '',
            words: item.words || '',
          }))
        }
      } catch (e) {
        lastErr = e
      }
    }
    return { success: false, error: 'Could not parse feed. Check the RSS URL is correct.', items: [] }
  } catch (e) {
    return { success: false, error: e.message, items: [] }
  }
})

// ── IPC: Forum search ──────────────────────────────────────────────────────────
ipcMain.handle('search:forums', async (_, query, sites) => {
  try {
    const results = await searchForums(query, sites)
    return { success: true, results }
  } catch (e) { return { success: false, error: e.message, results: [] } }
})
