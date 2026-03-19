/**
 * Forum search scraper — runs in the main process via IPC
 * Royal Road: uses their official API
 * SpaceBattles, SufficientVelocity, QuestionableQuesting: HTML scraping
 */

const https = require('https')
const http = require('http')

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...options.headers,
      },
      timeout: 10000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, options).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')) })
  })
}

// ── Royal Road ────────────────────────────────────────────────────────────────
async function searchRoyalRoad(query) {
  const url = `https://www.royalroad.com/fictions/search?title=${encodeURIComponent(query)}&type=fictions`
  const res = await fetchUrl(url)
  const results = []

  // Parse search results from HTML
  const cardRegex = /<div[^>]*class="[^"]*fiction-list-item[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*fiction-list-item|$)/g
  let match
  while ((match = cardRegex.exec(res.body)) !== null && results.length < 10) {
    const block = match[1]
    const titleMatch = block.match(/<a[^>]*href="(\/fiction\/\d+\/[^"]*)"[^>]*>\s*([^<]+)\s*<\/a>/)
    const authorMatch = block.match(/by\s+<a[^>]*>([^<]+)<\/a>/)
    const coverMatch = block.match(/<img[^>]*src="([^"]*royalroadcdn[^"]*)"/)
    const descMatch = block.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/)
    const chapterMatch = block.match(/(\d[\d,]*)\s+(?:Chapters?|chapters?)/)
    const ratingMatch = block.match(/(\d+\.\d+)\s*\/\s*5/)

    if (titleMatch) {
      results.push({
        site: 'royalroad',
        title: titleMatch[2].trim(),
        author: authorMatch ? authorMatch[1].trim() : '',
        cover_url: coverMatch ? coverMatch[1] : '',
        source_url: `https://www.royalroad.com${titleMatch[1]}`,
        total_chapters: chapterMatch ? chapterMatch[1].replace(/,/g, '') : '',
        description: descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 300) : '',
        rating: ratingMatch ? ratingMatch[1] : '',
        web_type: 'novel',
        genre: 'Web Novel',
        collection: 'web',
      })
    }
  }
  return results
}

// ── XenForo sites (SB, SV, QQ) ───────────────────────────────────────────────
async function searchXenForo(query, site) {
  const domains = {
    spacebattles: 'https://forums.spacebattles.com',
    sufficientvelocity: 'https://forums.sufficientvelocity.com',
    questionablequesting: 'https://forum.questionablequesting.com',
  }
  const base = domains[site]
  if (!base) return []

  const searchUrl = `${base}/search/1/?q=${encodeURIComponent(query)}&t=post&c[node]=15&o=date`
  const res = await fetchUrl(searchUrl)
  const results = []

  // XenForo search results
  const threadRegex = /<li[^>]*class="[^"]*searchResult[^"]*"[^>]*>([\s\S]*?)(?=<li[^>]*class="[^"]*searchResult|<\/ol>)/g
  let match
  while ((match = threadRegex.exec(res.body)) !== null && results.length < 8) {
    const block = match[1]
    const titleMatch = block.match(/<h3[^>]*class="[^"]*title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/)
    const authorMatch = block.match(/class="[^"]*username[^"]*"[^>]*>([^<]+)<\//)
    const snippetMatch = block.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/)

    if (titleMatch) {
      const relUrl = titleMatch[1]
      const fullUrl = relUrl.startsWith('http') ? relUrl : `${base}${relUrl}`
      results.push({
        site,
        title: titleMatch[2].trim(),
        author: authorMatch ? authorMatch[1].trim() : '',
        cover_url: '',
        source_url: fullUrl,
        total_chapters: '',
        description: snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 300) : '',
        web_type: 'novel',
        genre: 'Web Novel',
        collection: 'web',
      })
    }
  }

  // Fallback: try threadmarks/creative writing board directly
  if (results.length === 0) {
    const altUrl = `${base}/search/1/?q=${encodeURIComponent(query)}&o=relevance`
    const altRes = await fetchUrl(altUrl)
    const altRegex = /<h3[^>]*class="[^"]*title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+threads[^"]+)"[^>]*>([^<]+)<\/a>/g
    let altMatch
    while ((altMatch = altRegex.exec(altRes.body)) !== null && results.length < 8) {
      const relUrl = altMatch[1]
      const fullUrl = relUrl.startsWith('http') ? relUrl : `${base}${relUrl}`
      results.push({
        site,
        title: altMatch[2].trim(),
        author: '',
        cover_url: '',
        source_url: fullUrl,
        total_chapters: '',
        description: '',
        web_type: 'novel',
        genre: 'Web Novel',
        collection: 'web',
      })
    }
  }

  return results
}

async function searchForums(query, sites) {
  const searches = []
  if (sites.includes('royalroad')) searches.push(searchRoyalRoad(query).catch(e => { console.warn('RR search failed:', e.message); return [] }))
  if (sites.includes('spacebattles')) searches.push(searchXenForo(query, 'spacebattles').catch(e => { console.warn('SB search failed:', e.message); return [] }))
  if (sites.includes('sufficientvelocity')) searches.push(searchXenForo(query, 'sufficientvelocity').catch(e => { console.warn('SV search failed:', e.message); return [] }))
  if (sites.includes('questionablequesting')) searches.push(searchXenForo(query, 'questionablequesting').catch(e => { console.warn('QQ search failed:', e.message); return [] }))

  const all = await Promise.all(searches)
  return all.flat()
}

module.exports = { searchForums }
