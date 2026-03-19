import React, { useState, useRef, useEffect } from 'react'

// Common tags inspired by forum tagging conventions
const SUGGESTED_TAGS = [
  // Protagonist types
  'SI', 'Self-Insert', 'OC', 'Gender-Bend', 'Reincarnation', 'Transmigration', 'Isekai',
  // Story types
  'Gamer', 'System', 'Progression', 'Power Fantasy', 'Slice of Life', 'Romance',
  'Dark', 'Grimdark', 'Comedy', 'Crack', 'Smut', 'Wholesome',
  // Setting
  'Cultivation', 'Xianxia', 'Wuxia', 'LitRPG', 'Dungeon', 'Magic School',
  'Post-Apocalyptic', 'Military', 'Political', 'Harem',
  // Fan fiction specific
  'Crossover', 'Fix-It', 'AU', 'Canon Divergence', 'Missing Scene',
  // Quality/status
  'Completed', 'Ongoing', 'Abandoned', 'Hiatus', 'Regular Updates',
  'Long', 'Short', 'Epic',
]

export default function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [focused, setFocused] = useState(false)
  const inputRef = useRef()

  // tags is stored as comma-separated string
  const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []

  const showSuggestions = focused && input.trim().length > 0

  useEffect(() => {
    if (!input.trim()) { setSuggestions([]); return }
    const q = input.toLowerCase()
    const matches = SUGGESTED_TAGS.filter(t =>
      t.toLowerCase().includes(q) && !tagList.includes(t)
    ).slice(0, 6)
    setSuggestions(matches)
  }, [input, tags])

  const addTag = (tag) => {
    const cleaned = tag.trim()
    if (!cleaned || tagList.includes(cleaned)) { setInput(''); return }
    const newTags = [...tagList, cleaned].join(', ')
    onChange(newTags)
    setInput('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  const removeTag = (tag) => {
    const newTags = tagList.filter(t => t !== tag).join(', ')
    onChange(newTags)
  }

  const handleKey = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tagList.length > 0) {
      removeTag(tagList[tagList.length - 1])
    }
  }

  return (
    <div className="relative">
      <div
        className="flex flex-wrap gap-1.5 p-2 rounded-lg min-h-[40px] cursor-text"
        style={{ background: 'var(--bg-overlay)', border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`, transition: 'border-color 0.15s' }}
        onClick={() => inputRef.current?.focus()}>
        {tagList.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(201,135,58,0.15)', border: '1px solid rgba(201,135,58,0.3)', color: 'var(--accent-light)', fontSize: '11px', fontFamily: 'DM Sans, sans-serif' }}>
            {tag}
            <button onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              style={{ color: 'var(--accent)', lineHeight: 1, marginLeft: '1px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '10px', height: '10px' }}>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={tagList.length === 0 ? 'Type a tag and press Enter...' : ''}
          style={{ flex: '1', minWidth: '120px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', padding: '2px 4px' }}
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 rounded-lg overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => addTag(s)}
              className="w-full text-left px-3 py-2 transition-colors"
              style={{ fontSize: '12px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {s}
            </button>
          ))}
        </div>
      )}
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', marginTop: '4px' }}>
        Press Enter or comma to add · Backspace to remove last
      </p>
    </div>
  )
}
