import React, { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { PHYSICAL_STATUSES, WEB_STATUSES } from '../constants'

const COLORS = ['#c9873a','#5a9a6e','#4a7a9a','#9a4040','#7a6a3a','#8a5030','#6b5f52','#7a4a8a','#3a6a6a']

const TT_STYLE = {
  background: '#1c1a17', border: '1px solid rgba(201,135,58,0.3)',
  borderRadius: '8px', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', color: '#e8dcc8'
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="font-display text-3xl font-semibold mb-1" style={{ color: color || 'var(--accent)' }}>{value}</div>
      <div style={{ fontSize: '12px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-muted)', marginTop: '3px' }}>{sub}</div>}
    </div>
  )
}

export default function StatsView({ physicalBooks, webBooks }) {
  const all = useMemo(() => [...physicalBooks, ...webBooks], [physicalBooks, webBooks])

  const statusData = useMemo(() => {
    const allStatuses = [...PHYSICAL_STATUSES, ...WEB_STATUSES]
    const uniqueStatuses = [...new Map(allStatuses.map(s => [s.value, s])).values()]
    return uniqueStatuses
      .map(s => ({ name: s.label, value: all.filter(b => b.status === s.value).length, color: s.color }))
      .filter(d => d.value > 0)
  }, [all])

  const genreData = useMemo(() => {
    const counts = {}
    all.forEach(b => { if (b.genre) counts[b.genre] = (counts[b.genre] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }))
  }, [all])

  const monthlyData = useMemo(() => {
    const months = {}
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' })
      months[key] = { month: key, finished: 0, started: 0 }
    }
    all.forEach(b => {
      if (b.status_changed_at) {
        const d = new Date(b.status_changed_at)
        const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' })
        if (months[key]) {
          if (b.status === 'finished') months[key].finished++
          if (b.status === 'reading') months[key].started++
        }
      }
    })
    return Object.values(months)
  }, [all])

  const collectionData = [
    { name: 'Physical', value: physicalBooks.length },
    { name: 'Web', value: webBooks.length },
  ].filter(d => d.value > 0)

  const favorites = all.filter(b => b.is_favorite).length
  const finished = all.filter(b => b.status === 'finished').length
  const reading = all.filter(b => b.status === 'reading').length
  const rssFeeds = all.filter(b => b.rss_feed_url).length
  const withUpdates = all.filter(b => b.rss_has_update).length

  const avgChapter = useMemo(() => {
    const nums = all.map(b => parseInt(b.current_chapter)).filter(n => !isNaN(n) && n > 0)
    if (!nums.length) return 0
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
  }, [all])

  if (all.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12" style={{ color: 'var(--text-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <p className="font-display text-lg" style={{ color: 'var(--text-muted)' }}>No data yet</p>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>Add some books to see your reading stats</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Reading Statistics</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>Your library at a glance</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Top stats row */}
        <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          <StatCard label="Total Books" value={all.length} />
          <StatCard label="Finished" value={finished} color="var(--status-finished)" sub={all.length ? `${Math.round(finished/all.length*100)}% of library` : ''} />
          <StatCard label="Reading Now" value={reading} color="var(--status-reading)" />
          <StatCard label="Favorites" value={favorites} color="#f0c040" />
          <StatCard label="Avg Chapter" value={avgChapter || '—'} sub="across all books" />
          {rssFeeds > 0 && <StatCard label="RSS Feeds" value={rssFeeds} sub={withUpdates ? `${withUpdates} new update${withUpdates > 1 ? 's' : ''}` : 'all up to date'} color="var(--status-waiting)" />}
        </div>

        {/* Monthly Activity */}
        <div className="rounded-lg p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="font-display text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Activity (Last 12 Months)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fill: '#6b5f52', fontSize: 10, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b5f52', fontSize: 10, fontFamily: 'DM Sans' }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT_STYLE} cursor={{ fill: 'rgba(201,135,58,0.05)' }} />
              <Bar dataKey="finished" name="Finished" fill="#5a9a6e" radius={[3,3,0,0]} />
              <Bar dataKey="started" name="Started Reading" fill="#c9873a" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            {[['#5a9a6e','Finished'],['#c9873a','Started Reading']].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status + Collection pie charts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="font-display text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>By Status</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TT_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: '#a89880' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="font-display text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>By Collection</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={collectionData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {collectionData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={TT_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: '#a89880' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Genre breakdown */}
        {genreData.length > 0 && (
          <div className="rounded-lg p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="font-display text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Top Genres</h3>
            <ResponsiveContainer width="100%" height={Math.max(120, genreData.length * 28)}>
              <BarChart data={genreData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#6b5f52', fontSize: 10, fontFamily: 'DM Sans' }} allowDecimals={false} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#a89880', fontSize: 11, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT_STYLE} cursor={{ fill: 'rgba(201,135,58,0.05)' }} />
                <Bar dataKey="value" name="Books" radius={[0,3,3,0]}>
                  {genreData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
