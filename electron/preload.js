const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Books
  getBooks: (collection) => ipcRenderer.invoke('db:getBooks', collection),
  getReadingHistory: (page, pageSize, filters) => ipcRenderer.invoke('db:getReadingHistory', page, pageSize, filters),
  addBook: (book) => ipcRenderer.invoke('db:addBook', book),
  updateBook: (id, updates) => ipcRenderer.invoke('db:updateBook', id, updates),
  deleteBook: (id) => ipcRenderer.invoke('db:deleteBook', id),
  importBooks: (books) => ipcRenderer.invoke('db:importBooks', books),

  // RSS
  checkRssNow: () => ipcRenderer.invoke('rss:checkNow'),
  clearRssUpdate: (id) => ipcRenderer.invoke('rss:clearUpdate', id),
  onRssUpdate: (cb) => {
    const h = (_, d) => cb(d)
    ipcRenderer.on('rss:update', h)
    return () => ipcRenderer.removeListener('rss:update', h)
  },

  // Sync
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  triggerSync: () => ipcRenderer.invoke('sync:trigger'),
  onSyncUpdate: (cb) => {
    const h = (_, d) => cb(d)
    ipcRenderer.on('sync:update', h)
    return () => ipcRenderer.removeListener('sync:update', h)
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),

  // RSS fetch
  fetchRss: (url) => ipcRenderer.invoke('rss:fetch', url),

  // Forum search
  searchForums: (query, sites) => ipcRenderer.invoke('search:forums', query, sites),

  // App
  installUpdate: () => ipcRenderer.invoke('app:installUpdate'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  onUpdateReady: (cb) => {
    const h = () => cb()
    ipcRenderer.on('app:update-ready', h)
    return () => ipcRenderer.removeListener('app:update-ready', h)
  },
})
