import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AUTH_STORAGE_KEY, PREFERENCES_STORAGE_KEY } from '../utils/constants'
import { authService } from '../services/authService'
import { setDefaultCurrency } from '../utils/formatters'

const AuthContext = createContext(null)

function readSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function readFinancialProfile() {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeFinancialProfile(profile) {
  const current = readFinancialProfile()
  localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ ...current, ...profile }))
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const current = readSession()
    if (!current) return null
    return { ...current, user: { ...current.user, ...readFinancialProfile() } }
  })

  // Accepts a session or an updater, so back-to-back updates never overwrite each other.
  const persist = useCallback((next) => {
    setSession((current) => {
      const value = typeof next === 'function' ? next(current) : next
      if (value) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value))
      else localStorage.removeItem(AUTH_STORAGE_KEY)
      return value
    })
  }, [])

  // The stored user is a snapshot from sign-in. Refresh it once per load so a changed name,
  // username or currency (from this or another device) shows everywhere. A 401 here is
  // handled by api.js (back to /login).
  const token = session?.token
  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    authService
      .me()
      .then((fresh) => {
        if (cancelled) return
        persist((current) => (current?.token === token ? { ...current, user: { ...current.user, ...fresh } } : current))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [token, persist])

  const login = useCallback(
    async (email, password) => {
      const next = await authService.login(email, password)
      persist({ ...next, user: { ...next.user, ...readFinancialProfile() } })
      return next
    },
    [persist],
  )

  const logout = useCallback(() => persist(null), [persist])

  const updateUser = useCallback(
    (partial) => {
      const financial = {}
      if (partial.incomeTracking !== undefined) financial.incomeTracking = partial.incomeTracking
      if (partial.monthlyBudget !== undefined) financial.monthlyBudget = partial.monthlyBudget
      if (Object.keys(financial).length) writeFinancialProfile(financial)
      persist((current) => (current ? { ...current, user: { ...current.user, ...partial } } : current))
    },
    [persist],
  )

  // Before any page renders, so amounts on personal pages use the user's currency.
  setDefaultCurrency(session?.user?.currency)

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      isLoading: false,
      login,
      logout,
      updateUser,
    }),
    [session, login, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}