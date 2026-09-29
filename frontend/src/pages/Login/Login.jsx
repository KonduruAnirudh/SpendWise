import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { formatAuth0Error } from '../../Auth/AuthGate'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../context/AuthContext'
import { validateLogin } from '../../utils/validators'
import { DEMO_CREDENTIALS } from '../../utils/constants'

export function LoginPage() {
  const { login, loginWithAuth0, isAuth0Enabled, authError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState({ email: '', password: '', remember: true })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [auth0Submitting, setAuth0Submitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validateLogin(values)
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      await login(values.email, values.password)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (error) {
      setFormError(error.message || 'Invalid email or password')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAuth0() {
    setFormError('')
    setAuth0Submitting(true)
    try {
      await loginWithAuth0(location.state?.from || '/dashboard')
    } catch (error) {
      setFormError(formatAuth0Error(error))
      setAuth0Submitting(false)
    }
  }

  return (
    <div>
      <blockquote className="mb-8 text-center text-sm text-subtle italic">
        “Wealth is the ability to fully experience life.”
      </blockquote>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => setValues({ ...values, email: event.target.value })}
          error={errors.email}
        />
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => setValues({ ...values, password: event.target.value })}
          error={errors.password}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="rounded-md p-1 text-muted hover:text-fg"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
        />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted">
            <input
              type="checkbox"
              checked={values.remember}
              onChange={(event) => setValues({ ...values, remember: event.target.checked })}
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-accent hover:underline">
            Forgot password
          </Link>
        </div>
        {(formError || authError) && (
          <p className="text-sm text-danger">{formError || formatAuth0Error(authError)}</p>
        )}
        <Button type="submit" className="w-full" loading={submitting}>
          Sign in
        </Button>
        {isAuth0Enabled && (
          <>
            <div className="flex items-center gap-3 text-xs text-subtle">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              loading={auth0Submitting}
              onClick={handleAuth0}
            >
              Continue with Auth0
            </Button>
          </>
        )}
        <p className="text-center text-xs text-subtle">
          Demo: {DEMO_CREDENTIALS.email} / {DEMO_CREDENTIALS.password}
        </p>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
