/**
 * Generates:
 *   public/icon.png         — app icon (256x256)
 *   public/icon-tray.png    — tray icon (16x16)
 *   public/book-cover.png   — default book cover placeholder (200x300)
 */
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

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

// ── App icon (same as before) ─────────────────────────────────────────────────
function drawIcon(x, y, w, h) {
  const nx = x / w, ny = y / h
  const cx = 0.5, cy = 0.5
  const bg = [15, 14, 13]
  const gold = [201, 135, 58]
  const goldLight = [232, 168, 78]
  const page = [232, 220, 196]
  const spine = [154, 98, 32]
  const r = 0.12
  const dx = Math.max(0, Math.abs(nx - cx) - (0.5 - r))
  const dy = Math.max(0, Math.abs(ny - cy) - (0.5 - r))
  const dist = Math.sqrt(dx*dx + dy*dy)
  if (dist > r + 0.01) return bg
  const bx1 = 0.14, bx2 = 0.86, by1 = 0.18, by2 = 0.82
  const spineX1 = 0.46, spineX2 = 0.54
  if (nx >= bx1 && nx <= bx2 && ny >= by1 && ny <= by2) {
    if (nx >= spineX1 && nx <= spineX2) return spine
    const px1 = bx1 + 0.03, px2 = bx2 - 0.03
    const py1 = by1 + 0.06, py2 = by2 - 0.06
    if (nx >= px1 && nx <= spineX1 - 0.01 && ny >= py1 && ny <= py2) return page
    if (nx >= spineX2 + 0.01 && nx <= px2 && ny >= py1 && ny <= py2) return page
    return gold
  }
  if (nx >= 0.62 && nx <= 0.70 && ny >= by1 - 0.02 && ny <= by1 + 0.12) {
    if (ny > by1 + 0.08) {
      const midX = 0.66
      const pointFrac = (ny - (by1 + 0.08)) / 0.06
      const halfW = 0.04 * (1 - pointFrac)
      if (Math.abs(nx - midX) <= halfW) return goldLight
      return bg
    }
    return goldLight
  }
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

// ── Default book cover (2:3 ratio, 200x300) ──────────────────────────────────
function drawBookCover(x, y, w, h) {
  const nx = x / w, ny = y / h

  // Colors
  const bgDeep    = [18, 15, 12]
  const spine     = [40, 28, 16]
  const coverBase = [28, 22, 15]
  const gold      = [201, 135, 58]
  const goldDim   = [140, 90, 35]
  const goldFaint = [80, 55, 22]
  const pageEdge  = [210, 195, 170]
  const pageShadow= [160, 148, 128]

  const spineW = 0.10 // spine on left

  // Page edges on right
  if (nx > 0.93) {
    const lineY = (ny * h) % 3
    return lineY < 1.5 ? pageEdge : pageShadow
  }

  // Spine
  if (nx < spineW) {
    // Subtle vertical lines on spine
    const lineX = (nx * w) % 4
    if (lineX < 0.5) return [spine[0]+8, spine[1]+5, spine[2]+2]
    return spine
  }

  // Cover area
  const cx = (nx - spineW) / (1 - spineW) // 0..1 within cover
  const cy = ny

  // Outer border / frame
  const borderW = 0.04
  const inBorder = cx < borderW || cx > 1-borderW || cy < borderW || cy > 1-borderW
  if (inBorder) return [gold[0]-20, gold[1]-30, gold[2]-20]

  // Inner frame line
  const frameW = 0.06
  const inFrame = cx < frameW || cx > 1-frameW || cy < frameW || cy > 1-frameW
  if (inFrame) {
    // Corner ornaments
    const nearCornerX = cx < frameW + 0.04 || cx > 1 - frameW - 0.04
    const nearCornerY = cy < frameW + 0.04 || cy > 1 - frameW - 0.04
    if (nearCornerX && nearCornerY) return gold
    return goldFaint
  }

  // Center ornament — open book shape
  const ocx = 0.5, ocy = 0.42
  const dx = cx - ocx, dy = cy - ocy

  // Book pages (two arcs)
  const bookW = 0.28, bookH = 0.20
  const inLeftPage  = dx > -bookW && dx < -0.01 && dy > -bookH*0.5 && dy < bookH*0.6
  const inRightPage = dx > 0.01  && dx < bookW  && dy > -bookH*0.5 && dy < bookH*0.6

  if (inLeftPage || inRightPage) {
    // Page fill
    const edge = Math.abs(dy - bookH*0.6) < 0.015 || Math.abs(dy + bookH*0.5) < 0.015
    if (edge) return goldDim

    // Lines on pages
    const lineRelY = (dy + bookH*0.5) / (bookH * 1.1)
    const lineSpacing = 0.13
    if (Math.abs((lineRelY % lineSpacing) - lineSpacing/2) < 0.018) return goldDim
    return [gold[0]-60, gold[1]-80, gold[2]-40]
  }

  // Spine of the center book
  if (Math.abs(dx) < 0.015 && dy > -bookH*0.5 && dy < bookH*0.6) return gold

  // Title lines placeholder (3 horizontal lines)
  const titleY1 = 0.68, titleY2 = 0.74, titleY3 = 0.79
  const titleX1 = 0.15, titleX2 = 0.85
  const lineH = 0.018
  if (cx > titleX1 && cx < titleX2) {
    if (Math.abs(cy - titleY1) < lineH) return gold
    if (Math.abs(cy - titleY2) < lineH) return [gold[0]-30, gold[1]-45, gold[2]-20]
    if (Math.abs(cy - titleY3) < lineH * 0.7 && cx > titleX1+0.1 && cx < titleX2-0.1) return goldDim
  }

  // Author line
  const authorY = 0.88
  if (cx > 0.25 && cx < 0.75 && Math.abs(cy - authorY) < lineH * 0.7) return goldDim

  return coverBase
}

const out = path.join(__dirname, '..', 'public')
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'icon.png'), makePNG(256, 256, drawIcon))
fs.writeFileSync(path.join(out, 'icon-tray.png'), makePNG(16, 16, drawTray))
fs.writeFileSync(path.join(out, 'icon-tray@2x.png'), makePNG(32, 32, drawTray))
fs.writeFileSync(path.join(out, 'book-cover.png'), makePNG(200, 300, drawBookCover))
console.log('✅ Icons + default cover generated in public/')
