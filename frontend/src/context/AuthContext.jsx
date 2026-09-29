import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AUTH_STORAGE_KEY, PREFERENCES_STORAGE_KEY } from '../utils/constants'
import { authService } from '../services/authService'

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

  const persist = useCallback((next) => {
    setSession(next)
    if (next) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  const login = useCallback(
    async (email, password) => {
      const next = await authService.login(email, password)
      persist({ ...next, user: { ...next.user, ...readFinancialProfile() } })
      return next
    },
    [persist],
  )

  // Kept so existing pages that reference it still compile; SSO is not enabled.
  const loginWithAuth0 = useCallback(async () => {
    throw new Error('Single sign-on is not enabled for this app.')
  }, [])

  const logout = useCallback(() => persist(null), [persist])

  const updateUser = useCallback(
    (partial) => {
      const financial = {}
      if (partial.incomeTracking !== undefined) financial.incomeTracking = partial.incomeTracking
      if (partial.monthlyBudget !== undefined) financial.monthlyBudget = partial.monthlyBudget
      if (Object.keys(financial).length) writeFinancialProfile(financial)
      if (session) persist({ ...session, user: { ...session.user, ...partial } })
    },
    [persist, session],
  )

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      isLoading: false,
      isAuth0Enabled: false,
      authError: undefined,
      login,
      loginWithAuth0,
      logout,
      updateUser,
    }),
    [session, login, loginWithAuth0, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}