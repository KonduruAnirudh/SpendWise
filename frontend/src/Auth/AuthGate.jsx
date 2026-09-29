import { Logo } from '../components/ui/Logo'
import { useAuth } from '../context/AuthContext'

export function AuthGate({ children }) {
  const { isLoading, isAuth0Enabled } = useAuth()

  if (isAuth0Enabled && isLoading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-bg px-6 text-fg">
        <Logo className="mb-6" />
        <p className="text-sm text-muted">Connecting to Auth0…</p>
      </div>
    )
  }

  return children
}

export function formatAuth0Error(error) {
  const message = error?.message || String(error)
  if (/callback/i.test(message) || /redirect_uri/i.test(message) || /origin/i.test(message)) {
    return 'Auth0 rejected this origin. In the Auth0 dashboard, add http://localhost:5173 to Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins. Open the app as localhost, not 127.0.0.1.'
  }
  if (/invalid state/i.test(message)) {
    return 'The Auth0 sign-in session expired or the callback was interrupted. Try signing in again.'
  }
  return message
}
