/**
 * Generates public/icon.png (256x256) and public/icon-tray.png (16x16)
 * Run once before building: node scripts/generate-icon.js
 * Requires: npm install (png-chunks-encode is not needed — uses raw zlib)
 */
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

// ── PNG writer ────────────────────────────────────────────────────────────────
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n, 0); return b }
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const crc = u32(crc32(Buffer.concat([t, data])))
  return Buffer.concat([u32(data.length), t, data, crc])
}
function makePNG(w, h, draw) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10])
  const ihdr = chunk('IHDR', Buffer.concat([u32(w), u32(h), Buffer.from([8,2,0,0,0])]))
  const rows = []
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 3)
    row[0] = 0
    for (let x = 0; x < w; x++) {
      const [r,g,b] = draw(x, y, w, h)
      row[1+x*3]=r; row[2+x*3]=g; row[3+x*3]=b
    }
    rows.push(row)
  }
  const idat = chunk('IDAT', zlib.deflateSync(Buffer.concat(rows)))
  const iend = chunk('IEND', Buffer.alloc(0))
  return Buffer.concat([sig, ihdr, idat, iend])
}

// ── Draw a simple book icon ───────────────────────────────────────────────────
function drawIcon(x, y, w, h) {
  const nx = x / w, ny = y / h
  const cx = 0.5, cy = 0.5
  const bg = [15, 14, 13]
  const gold = [201, 135, 58]
  const goldLight = [232, 168, 78]
  const page = [232, 220, 196]
  const spine = [154, 98, 32]

  // Rounded rect background
  const r = 0.12
  const dx = Math.max(0, Math.abs(nx - cx) - (0.5 - r))
  const dy = Math.max(0, Math.abs(ny - cy) - (0.5 - r))
  const dist = Math.sqrt(dx*dx + dy*dy)
  if (dist > r + 0.01) return bg

  // Book body — two rectangles side by side with spine in middle
  const bx1 = 0.14, bx2 = 0.86, by1 = 0.18, by2 = 0.82
  const spineX1 = 0.46, spineX2 = 0.54

  if (nx >= bx1 && nx <= bx2 && ny >= by1 && ny <= by2) {
    // Spine
    if (nx >= spineX1 && nx <= spineX2) return spine
    // Pages (inner)
    const px1 = bx1 + 0.03, px2 = bx2 - 0.03
    const py1 = by1 + 0.06, py2 = by2 - 0.06
    if (nx >= px1 && nx <= spineX1 - 0.01 && ny >= py1 && ny <= py2) return page
    if (nx >= spineX2 + 0.01 && nx <= px2 && ny >= py1 && ny <= py2) return page
    // Cover border
    return gold
  }
  // Bookmark ribbon at top right
  if (nx >= 0.62 && nx <= 0.70 && ny >= by1 - 0.02 && ny <= by1 + 0.12) {
    if (ny > by1 + 0.08) {
      // Pointed bottom of bookmark
      const midX = 0.66
      const pointFrac = (ny - (by1 + 0.08)) / 0.06
      const halfW = 0.04 * (1 - pointFrac)
      if (Math.abs(nx - midX) <= halfW) return goldLight
      return bg
    }
    return goldLight
  }
  // Lines on pages
  const lineColor = [180, 165, 140]
  if (nx >= bx1+0.05 && nx <= spineX1-0.03 && ny >= by1+0.12 && ny <= by2-0.10) {
    const lineSpacing = 0.07
    const relY = (ny - (by1+0.12)) / (by2 - by1 - 0.22)
    if ((relY % lineSpacing) < 0.015) return lineColor
  }
  if (nx >= spineX2+0.03 && nx <= bx2-0.05 && ny >= by1+0.12 && ny <= by2-0.10) {
    const lineSpacing = 0.07
    const relY = (ny - (by1+0.12)) / (by2 - by1 - 0.22)
    if ((relY % lineSpacing) < 0.015) return lineColor
  }
  return bg
}

function drawTray(x, y, w, h) {
  const nx = x/w, ny = y/h
  const gold = [201, 135, 58]
  const bg = [0,0,0]
  if (nx >= 0.1 && nx <= 0.9 && ny >= 0.1 && ny <= 0.9) {
    const spine = nx >= 0.45 && nx <= 0.55
    if (spine) return [154, 98, 32]
    return gold
  }
  return bg
}

const out = path.join(__dirname, '..', 'public')
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'icon.png'), makePNG(256, 256, drawIcon))
fs.writeFileSync(path.join(out, 'icon-tray.png'), makePNG(16, 16, drawTray))
console.log('✅ Icons generated in public/')
