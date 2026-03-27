import React, { useMemo, useRef, useState } from 'react'
import { getShelfLabel, PHYSICAL_STATUSES, WEB_STATUSES } from '../constants'
import { normalizeShelves } from '../library'

const TEMPLATE_PHYSICAL = `title,author,genre,status,current_chapter,total_chapters,year,notes,is_favorite,shelves
"The Name of the Wind",Patrick Rothfuss,Fantasy,reading,42,,2007,,false,physical|Bedside
"Project Hail Mary",Andy Weir,Science Fiction,finished,,,2021,,true,To Buy|Commute`

const TEMPLATE_WEB = `title,author,genre,status,current_chapter,total_chapters,year,source_url,rss_feed_url,is_favorite,shelves
"Omniscient Reader",sing N song,Manhwa,finished,551,551,2020,https://example.com,,true,web|Rereads
"Solo Leveling",Chugong,Manhwa,waiting,179,179,2018,,,false,web|Commute`

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(line => line.trim())
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0]).map(header => header.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const row = {}
    headers.forEach((header, index) => { row[header] = (values[index] || '').trim() })
    return row
  })
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export default function ImportModal({ shelves, defaultCollection = 'physical', defaultShelf = 'physical', onClose, onImport }) {
  const [collection, setCollection] = useState(defaultCollection)
  const [shelf, setShelf] = useState(defaultShelf)
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(null)
  const fileRef = useRef()

  const shelfOptions = useMemo(
    () => shelves.filter(item => item.collection === collection),
    [shelves, collection]
  )
  const validStatuses = collection === 'physical'
    ? PHYSICAL_STATUSES.map(status => status.value)
    : WEB_STATUSES.map(status => status.value)

  const resetPreview = (nextCollection, nextShelf) => {
    setCollection(nextCollection)
    setShelf(nextShelf)
    setPreview([])
    setCsvText('')
    setErrors([])
  }

  const parseAndPreview = (text, activeCollection = collection, activeShelf = shelf) => {
    const rows = parseCSV(text)
    const rowErrors = []
    const parsed = rows.map((row, index) => {
      if (!row.title) {
        rowErrors.push(`Row ${index + 2}: Missing title`)
        return null
      }
      const status = row.status && validStatuses.includes(row.status) ? row.status : 'unread'
      return {
        collection: activeCollection,
        shelves: normalizeShelves(row.shelves || row.shelf || activeShelf, activeCollection),
        title: row.title,
        author: row.author || '',
        genre: row.genre || '',
        status,
        current_chapter: row.current_chapter || '',
        total_chapters: row.total_chapters || '',
        year: row.year ? parseInt(row.year, 10) || null : null,
        notes: row.notes || '',
        source_url: row.source_url || '',
        rss_feed_url: row.rss_feed_url || '',
        is_favorite: row.is_favorite === 'true' || row.is_favorite === '1',
      }
    }).filter(Boolean)
    setErrors(rowErrors)
    setPreview(parsed)
  }

  const handleFile = (event) => {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const text = loadEvent.target.result
      setCsvText(text)
      parseAndPreview(text)
    }
    reader.readAsText(file)
  }

  const handleTextChange = (text) => {
    setCsvText(text)
    parseAndPreview(text)
  }

  const handleImport = async () => {
    if (!preview.length) return
    setImporting(true)
    const result = await onImport(preview)
    setDone(result)
    setImporting(false)
  }

  const downloadTemplate = () => {
    const text = collection === 'physical' ? TEMPLATE_PHYSICAL : TEMPLATE_WEB
    const blob = new Blob([text], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `library-template-${collection}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose} style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl fade-in"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}
        onClick={event => event.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Bulk Import via CSV</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '4px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>Books</div>
            <p className="font-display text-xl mb-2" style={{ color: 'var(--text-primary)' }}>Import Complete</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', fontSize: '14px' }}>
              {done.count} {done.count === 1 ? 'book' : 'books'} added with {getShelfLabel(shelf)} as the default shelf.
            </p>
            <button onClick={onClose} className="mt-5 px-5 py-2 rounded-lg"
              style={{ background: 'var(--accent)', color: '#0a0908', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div>
              <label style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '8px' }}>
                Import into
              </label>
              <div className="flex gap-3 mb-3">
                {['physical', 'web'].map(type => {
                  const firstShelf = shelves.find(item => item.collection === type)?.id || type
                  return (
                    <button key={type} onClick={() => resetPreview(type, firstShelf)}
                      style={{ padding: '6px 16px', borderRadius: '6px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', background: collection === type ? 'var(--accent)' : 'var(--bg-overlay)', color: collection === type ? '#0a0908' : 'var(--text-secondary)', border: '1px solid ' + (collection === type ? 'var(--accent)' : 'var(--border)') }}>
                      {type === 'physical' ? 'Physical' : 'Web'}
                    </button>
                  )
                })}
              </div>
              <select
                value={shelf}
                onChange={event => { setShelf(event.target.value); parseAndPreview(csvText, collection, event.target.value) }}
                style={{ width: '100%', background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px', padding: '8px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}
              >
                {shelfOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
              <p style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px' }}>
                Use a `shelves` column with `|` separators to place a book on multiple shelves.
              </p>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(201,135,58,0.06)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Download the CSV template to see the expected format
              </p>
              <button onClick={downloadTemplate}
                style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--accent)', whiteSpace: 'nowrap', marginLeft: '12px', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(201,135,58,0.3)' }}>
                Template
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  CSV Data
                </label>
                <button onClick={() => fileRef.current?.click()}
                  style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--accent)', border: '1px solid rgba(201,135,58,0.3)', padding: '3px 8px', borderRadius: '4px' }}>
                  Upload file
                </button>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
              <textarea value={csvText} onChange={event => handleTextChange(event.target.value)} placeholder="Or paste CSV text here..."
                style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', width: '100%', minHeight: '120px', resize: 'vertical', outline: 'none', fontFamily: 'monospace' }}
                onFocus={event => event.target.style.borderColor = 'var(--accent)'}
                onBlur={event => event.target.style.borderColor = 'var(--border)'} />
            </div>

            {errors.length > 0 && (
              <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(154,64,64,0.1)', border: '1px solid rgba(154,64,64,0.3)' }}>
                {errors.map((error, index) => <p key={index} style={{ fontSize: '12px', color: '#f0a0a0', fontFamily: 'DM Sans, sans-serif' }}>{error}</p>)}
              </div>
            )}

            {preview.length > 0 && (
              <div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Preview: {preview.length} {preview.length === 1 ? 'book' : 'books'} to import
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {preview.map((book, index) => (
                    <div key={`${book.title}-${index}`} className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: 'var(--bg-overlay)' }}>
                      <span className="flex-1 truncate" style={{ fontSize: '13px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-primary)' }}>{book.title}</span>
                      {book.author && <span className="truncate" style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>{book.author}</span>}
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>{book.shelves.map(getShelfLabel).join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!done && (
          <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', color: 'var(--text-secondary)', background: 'var(--bg-overlay)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Cancel</button>
            <button onClick={handleImport} disabled={!preview.length || importing}
              style={{ padding: '8px 20px', borderRadius: '6px', background: 'var(--accent)', color: '#0a0908', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: '500', opacity: !preview.length || importing ? 0.5 : 1 }}>
              {importing ? 'Importing...' : `Import ${preview.length || ''} Books`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
