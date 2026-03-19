import React, { useState } from 'react'

export default function ExportImportModal({ onClose, onExportCSV, onExportOPML, onImport }) {
  const [tab, setTab] = useState('export')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl flex flex-col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', width: '100%', maxWidth: '420px', maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Import / Export</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: '20px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
          {['export', 'import'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 capitalize"
              style={{ fontSize: '13px', color: tab === t ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: tab === t ? '600' : '400', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer' }}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          {tab === 'export' && (
            <>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Export your library data to a file.</p>

              <button onClick={onExportCSV}
                className="w-full flex items-center gap-3 p-4 rounded-xl text-left"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,135,58,0.12)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px', color: 'var(--accent)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', margin: 0 }}>Export as CSV</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>All book data — import back later or open in Excel</p>
                </div>
              </button>

              <button onClick={onExportOPML}
                className="w-full flex items-center gap-3 p-4 rounded-xl text-left"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(90,154,110,0.12)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px', color: '#5a9a6e' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110 2 1 1 0 010-2z" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', margin: 0 }}>Export as OPML</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>RSS feed URLs — import into RSS Feeder, Feedly, etc.</p>
                </div>
              </button>
            </>
          )}

          {tab === 'import' && (
            <>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Import books from a previously exported CSV file.</p>
              <button onClick={onImport}
                className="w-full flex items-center gap-3 p-4 rounded-xl text-left"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,135,58,0.12)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px', color: 'var(--accent)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" style={{ transform: 'rotate(180deg)', transformOrigin: 'center' }} />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5v-2.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25V7.5M12 3v9m0 0l-3-3m3 3l3-3" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', margin: 0 }}>Import from CSV</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Bulk add books from a CSV file</p>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
