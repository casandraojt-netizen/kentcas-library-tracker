export const PHYSICAL_STATUSES = [
  { value: 'reading', label: 'Reading', color: 'var(--status-reading)' },
  { value: 'finished', label: 'Finished', color: 'var(--status-finished)' },
  { value: 'unread', label: 'Unread', color: 'var(--status-unread)' },
  { value: 'dropped', label: 'Dropped', color: 'var(--status-dropped)' },
]

export const WEB_STATUSES = [
  { value: 'reading', label: 'Reading', color: 'var(--status-reading)' },
  { value: 'finished', label: 'Finished', color: 'var(--status-finished)' },
  { value: 'unread', label: 'Unread', color: 'var(--status-unread)' },
  { value: 'dropped', label: 'Dropped', color: 'var(--status-dropped)' },
  { value: 'waiting', label: 'Waiting for Updates', color: 'var(--status-waiting)' },
  { value: 'abandoned', label: 'Abandoned by Author', color: 'var(--status-abandoned)' },
  { value: 'hiatus', label: 'On Hiatus', color: 'var(--status-hiatus)' },
]

export const PHYSICAL_GENRES = [
  'Fantasy', 'Science Fiction', 'Mystery', 'Thriller', 'Romance', 'Historical Fiction',
  'Literary Fiction', 'Horror', 'Adventure', 'Biography', 'Self-Help', 'Non-Fiction',
  'Philosophy', 'Classics', 'Young Adult', 'Graphic Novel', 'Poetry', 'Other'
]

export const WEB_GENRES = [
  'Xianxia', 'Wuxia', 'Xuanhuan', 'Isekai', 'Fantasy', 'System / LitRPG',
  'Romance', 'Harem', 'Action', 'Adventure', 'Horror', 'Mystery', 'Slice of Life',
  'Sci-Fi', 'Shounen', 'Shoujo', 'Seinen', 'Josei', 'Manhwa', 'Manhua', 'Manga',
  'Webcomic', 'Progression Fantasy', 'Dungeon Core', 'Reincarnation', 'Other'
]

export const WEB_TYPES = [
  { value: 'novel', label: 'Web Novel' },
  { value: 'comic', label: 'Web Comic / Manga / Manhwa / Manhua' },
]

export const DEFAULT_SHELVES = [
  { id: 'physical', name: 'Physical Books', collection: 'physical', isDefault: true, description: 'Your bookshelf' },
  { id: 'web', name: 'Web Books', collection: 'web', isDefault: true, description: 'Novels, manhwa & manga' },
]

export const getStatuses = (collection) => collection === 'physical' ? PHYSICAL_STATUSES : WEB_STATUSES
export const getGenres = (collection) => collection === 'physical' ? PHYSICAL_GENRES : WEB_GENRES
export const getStatusInfo = (status) =>
  [...PHYSICAL_STATUSES, ...WEB_STATUSES].find(s => s.value === status) || { label: status, color: 'var(--text-muted)' }

export const getCollectionLabel = (collection) => collection === 'physical' ? 'Physical' : 'Web'
export const getShelfLabel = (shelf) => DEFAULT_SHELVES.find(item => item.id === shelf)?.name || shelf
export const getShelfDescription = (shelf) => DEFAULT_SHELVES.find(item => item.id === shelf)?.description || 'Custom list'
export const normalizeAuthorName = (author) => author.trim().toLowerCase().replace(/\s+/g, ' ')
