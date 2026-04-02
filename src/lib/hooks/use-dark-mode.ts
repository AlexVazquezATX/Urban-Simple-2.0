import { useState, useEffect } from 'react'

const DARK_MODE_KEY = 'urbansimple-dark-mode'

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(DARK_MODE_KEY) === 'true'
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(DARK_MODE_KEY, String(isDark))
  }, [isDark])

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem(DARK_MODE_KEY)
    if (saved === 'true') {
      setIsDark(true)
    }
  }, [])

  const toggle = () => setIsDark(prev => !prev)

  return { isDark, toggle }
}
