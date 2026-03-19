import { useState, useEffect } from 'react'

const DEFAULTS = {
  theme: 'dark',
  cardSize: 'normal', // compact | normal | large
}

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('app-settings')
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS
    } catch { return DEFAULTS }
  })

  const update = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      try { localStorage.setItem('app-settings', JSON.stringify(next)) } catch {}
      return next
    })
  }

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  return { settings, update }
}
