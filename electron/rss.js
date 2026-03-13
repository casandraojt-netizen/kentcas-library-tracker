const { getBooksWithRssFeed, markRssUpdate } = require('./db/local')

let rssListeners = []
function onRssEvent(cb) { rssListeners.push(cb) }
function emitRss(event) { rssListeners.forEach(cb => cb(event)) }

async function checkAllFeeds() {
  let books
  try { books = getBooksWithRssFeed() } catch (e) { return }
  if (!books.length) return

  let Parser
  try { Parser = require('rss-parser') } catch (e) { console.error('rss-parser not available'); return }

  const parser = new Parser({ timeout: 8000, headers: { 'User-Agent': 'LibraryTracker/1.0' } })
  let updatesFound = 0

  for (const book of books) {
    try {
      const feed = await parser.parseURL(book.rss_feed_url)
      const latestItem = feed.items && feed.items[0]
      if (!latestItem) continue

      const latestTitle = latestItem.title || ''
      const isNew = latestTitle && latestTitle !== book.rss_last_item_title

      // First check: just record the latest, don't show as update
      if (!book.rss_last_item_title) {
        markRssUpdate(book.id, latestTitle, false)
      } else if (isNew) {
        markRssUpdate(book.id, latestTitle, true)
        updatesFound++
        emitRss({ type: 'update', bookId: book.id, bookTitle: book.title, latestTitle })
      } else {
        markRssUpdate(book.id, latestTitle, book.rss_has_update)
      }
    } catch (err) {
      console.warn(`RSS check failed for "${book.title}":`, err.message)
    }
  }

  if (updatesFound > 0) {
    emitRss({ type: 'summary', count: updatesFound })
  }
}

function startRssPoller(intervalMs = 30 * 60 * 1000) {
  // First check after 10 seconds
  setTimeout(checkAllFeeds, 10000)
  return setInterval(checkAllFeeds, intervalMs)
}

module.exports = { checkAllFeeds, startRssPoller, onRssEvent }
