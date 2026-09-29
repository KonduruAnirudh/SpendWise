import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { THEME_STORAGE_KEY } from '../utils/constants'

const ThemeContext = createContext(null)

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved) {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.style.colorScheme = resolved
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(
    () => localStorage.getItem(THEME_STORAGE_KEY) || 'dark',
  )
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)
  const resolved = preference === 'system' ? systemTheme : preference

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
    applyTheme(resolved)
  }, [preference, resolved])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemTheme(media.matches ? 'dark' : 'light')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
