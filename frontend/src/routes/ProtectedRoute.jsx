import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '../components/ui/Logo'
import { useAuth } from '../context/AuthContext'

function AuthSpinner() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-bg px-6 text-fg">
      <Logo className="mb-6" />
      <p className="text-sm text-muted">Loading your session…</p>
    </div>
  )
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <AuthSpinner />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <AuthSpinner />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
