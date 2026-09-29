import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { isAuth0Configured } from '../Auth/Auth0Provider'
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

function mapAuth0User(auth0User) {
  if (!auth0User) return null
  return {
    id: auth0User.sub,
    name: auth0User.name || auth0User.nickname || auth0User.email || 'SpendWise user',
    email: auth0User.email || '',
    picture: auth0User.picture,
    authProvider: 'auth0',
    ...readFinancialProfile(),
  }
}

export function AuthProvider({ children }) {
  const auth0 = useAuth0()
  const auth0Enabled = isAuth0Configured()
  const [session, setSession] = useState(() => {
    const current = readSession()
    if (!current) return null
    return { ...current, user: { ...current.user, ...readFinancialProfile() } }
  })
  const [profileVersion, setProfileVersion] = useState(0)

  const persist = useCallback((next) => {
    setSession(next)
    if (next) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  const login = useCallback(
    async (email, password) => {
      const next = await authService.login(email, password)
      const profile = readFinancialProfile()
      persist({ ...next, user: { ...next.user, ...profile } })
      return next
    },
    [persist],
  )

  const loginWithAuth0 = useCallback(
    async (returnTo = '/dashboard') => {
      if (!auth0Enabled) {
        throw new Error('Auth0 is not configured. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID.')
      }
      await auth0.loginWithRedirect({
        appState: { returnTo },
      })
    },
    [auth0, auth0Enabled],
  )

  const logout = useCallback(() => {
    persist(null)
    if (auth0Enabled && auth0.isAuthenticated) {
      auth0.logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      })
    }
  }, [auth0, auth0Enabled, persist])

  const updateUser = useCallback(
    (partial) => {
      const financial = {}
      if (partial.incomeTracking !== undefined) financial.incomeTracking = partial.incomeTracking
      if (partial.monthlyBudget !== undefined) financial.monthlyBudget = partial.monthlyBudget
      if (Object.keys(financial).length) writeFinancialProfile(financial)

      if (session) {
        persist({ ...session, user: { ...session.user, ...partial } })
        return
      }
      setProfileVersion((current) => current + 1)
    },
    [persist, session],
  )

  const auth0User = useMemo(() => {
    if (!auth0Enabled || !auth0.isAuthenticated) return null
    return mapAuth0User(auth0.user)
  }, [auth0.isAuthenticated, auth0.user, auth0Enabled, profileVersion])

  const value = useMemo(
    () => ({
      user: session?.user ?? auth0User,
      token: session?.token ?? (auth0User ? 'auth0' : null),
      isAuthenticated: Boolean(session?.token) || Boolean(auth0User),
      isLoading: auth0Enabled && auth0.isLoading,
      isAuth0Enabled: auth0Enabled,
      authError: auth0Enabled ? auth0.error : undefined,
      login,
      loginWithAuth0,
      logout,
      updateUser,
    }),
    [
      session,
      auth0User,
      auth0Enabled,
      auth0.isLoading,
      auth0.error,
      login,
      loginWithAuth0,
      logout,
      updateUser,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
