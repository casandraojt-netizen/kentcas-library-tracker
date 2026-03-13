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

let mainWindow = null
let tray = null
let syncInterval = null
let rssInterval = null
let isQuitting = false

// ── Tray icon ──────────────────────────────────────────────────────────────────
function getTrayIcon() {
  const trayIconPath = path.join(__dirname, '..', 'public', 'icon-tray.png')
  if (fs.existsSync(trayIconPath)) {
    return nativeImage.createFromPath(trayIconPath).resize({ width: 16, height: 16 })
  }
  // Fallback: tiny amber square
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABLSURBVDiNY2CgIvifgYGBgZEBBRgZmBiIAAYGJgYygIGBiQEfYGBgYsAHGBiYGPABBgYmBnyAgYGJAR9gYGBiwAcYGJgY8AEGBgDrPgx12xsk0QAAAABJRU5ErkJggg=='
  )
}

function createTray() {
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
    },
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
  rssInterval = rss.startRssPoller(30 * 60 * 1000)

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

app.on('before-quit', () => { isQuitting = true })
app.on('window-all-closed', () => {
  if (syncInterval) clearInterval(syncInterval)
  if (rssInterval) clearInterval(rssInterval)
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
    const saved = localDb.updateBook(id, updates)
    sync.runSync()
    return { success: true, data: saved }
  } catch (e) { return { success: false, error: e.message } }
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
