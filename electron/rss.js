const { getBooksWithRssFeed, markRssUpdate } = require('./db/local')
const https = require('https')
const http = require('http')

let rssListeners = []
function onRssEvent(cb) { rssListeners.push(cb) }
function emitRss(event) { rssListeners.forEach(cb => cb(event)) }

// Poll frequency tiers
const ACTIVE_STATUSES    = ['reading', 'waiting']          // check every 15 min
const INACTIVE_STATUSES  = ['unread', 'hiatus', 'dropped'] // check every 6 hours
const SKIP_STATUSES      = ['finished', 'abandoned']       // startup only

function fetchRaw(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) { reject(new Error('Too many redirects')); return }
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      timeout: 12000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchRaw(res.headers.location, redirectCount + 1).then(resolve).catch(reject)
      }
      let data = ''
      res.setEncoding('utf8')
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timed out')) })
  })
}

async function parseFeed(feedUrl) {
  const url = feedUrl + (feedUrl.includes('?') ? '&' : '?') + '_t=' + Date.now()
  const { status, body } = await fetchRaw(url)
  if (status !== 200 || !body) return null

  const Parser = require('rss-parser')
  const strategies = [
    { xml2js: { strict: true } },
    { xml2js: { strict: false, normalize: true, normalizeTags: false } },
    { xml2js: { strict: false, normalize: false, normalizeTags: false } },
  ]
  for (const opts of strategies) {
    try {
      const parser = new Parser({
        ...opts,
        customFields: { item: [['content:encoded', 'contentEncoded'], ['dc:creator', 'creator'], ['threadmarks:likes', 'likes'], ['threadmarks:words', 'words']] },
      })
      return await parser.parseString(body)
    } catch (_) {}
  }
  return null
}

async function processBook(book) {
  try {
    const feed = await parseFeed(book.rss_feed_url)
    if (!feed) return

    const latestItem = feed.items && feed.items[0]
    if (!latestItem) return

    const latestTitle = latestItem.title || ''
    const latestDate = latestItem.pubDate || latestItem.isoDate || null
    const latestDateISO = latestDate ? new Date(latestDate).toISOString() : null
    const latestUrl = latestItem.link || latestItem.guid || ''

    console.log(`[RSS] "${book.title}" latest: "${latestTitle}" date: ${latestDateISO}`)

    if (!book.rss_last_item_title) {
      markRssUpdate(book.id, latestTitle, false, latestDateISO, latestUrl)
    } else if (latestTitle !== book.rss_last_item_title) {
      markRssUpdate(book.id, latestTitle, true, latestDateISO, latestUrl)
      emitRss({ type: 'update', bookId: book.id, bookTitle: book.title, latestTitle })
      return true
    } else {
      markRssUpdate(book.id, latestTitle, book.rss_has_update, latestDateISO, latestUrl)
    }
  } catch (err) {
    console.warn(`RSS check failed for "${book.title}": ${err.message}`)
  }
  return false
}

async function checkFeeds(books) {
  if (!books.length) return
  let updatesFound = 0

  // Process in batches of 5 simultaneously — fast but won't hammer servers
  const BATCH_SIZE = 5
  const BATCH_DELAY = 3000 // 3s between batches

  for (let i = 0; i < books.length; i += BATCH_SIZE) {
    const batch = books.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map(book => processBook(book)))
    updatesFound += results.filter(Boolean).length

    // Delay between batches (not after the last one)
    if (i + BATCH_SIZE < books.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY))
    }
  }

  if (updatesFound > 0) {
    emitRss({ type: 'summary', count: updatesFound })
    console.log(`[RSS] ${updatesFound} new chapter${updatesFound > 1 ? 's' : ''} found`)
  }
}

function getBooksWithFeed() {
  try { return require('./db/local').getBooksWithRssFeed() } catch { return [] }
}

function filterByStatus(books, statuses) {
  return books.filter(b => statuses.includes(b.status))
}

// Startup: check ALL books with RSS feeds regardless of status
async function checkAllFeedsStartup() {
  const books = getBooksWithFeed()
  console.log(`[RSS] Startup check — ${books.length} books with RSS feeds`)
  await checkFeeds(books)
}

// Active poll (every 15 min): reading + waiting only
async function checkActiveFeeds() {
  const books = filterByStatus(getBooksWithFeed(), ACTIVE_STATUSES)
  if (!books.length) return
  console.log(`[RSS] Active check — ${books.length} reading/waiting books`)
  await checkFeeds(books)
}

// Inactive poll (every 6 hours): unread + hiatus + dropped
async function checkInactiveFeeds() {
  const books = filterByStatus(getBooksWithFeed(), INACTIVE_STATUSES)
  if (!books.length) return
  console.log(`[RSS] Inactive check — ${books.length} unread/hiatus/dropped books`)
  await checkFeeds(books)
}

function startRssPoller() {
  // Startup check — all books, fires immediately
  checkAllFeedsStartup()

  // Active books (reading/waiting) — every 15 minutes
  const activeInterval = setInterval(checkActiveFeeds, 15 * 60 * 1000)

  // Inactive books (unread/hiatus/dropped) — every 6 hours
  const inactiveInterval = setInterval(checkInactiveFeeds, 6 * 60 * 60 * 1000)

  // Return both intervals so main.js can clear them on quit
  return [activeInterval, inactiveInterval]
}

module.exports = { checkAllFeeds: checkAllFeedsStartup, startRssPoller, onRssEvent }
