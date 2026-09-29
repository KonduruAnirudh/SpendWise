import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatAuth0Error } from '../../Auth/AuthGate'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { authService } from '../../services/authService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { validateSignup } from '../../utils/validators'

export function SignupPage() {
  const navigate = useNavigate()
  const { loginWithAuth0, isAuth0Enabled } = useAuth()
  const { push } = useToast()
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [auth0Submitting, setAuth0Submitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validateSignup(values)
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      await authService.signup(values)
      push('Account created. Please sign in.')
      navigate('/login')
    } catch (error) {
      setFormError(error.message || 'Unable to create account.')
    } finally {
      setSubmitting(false)
    }
  }

  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }))

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <Input label="Full name" value={values.name} onChange={(event) => set('name', event.target.value)} error={errors.name} />
        <Input label="Email" type="email" value={values.email} onChange={(event) => set('email', event.target.value)} error={errors.email} />
        <Input label="Password" type="password" value={values.password} onChange={(event) => set('password', event.target.value)} error={errors.password} />
        <Input
          label="Confirm password"
          type="password"
          value={values.confirmPassword}
          onChange={(event) => set('confirmPassword', event.target.value)}
          error={errors.confirmPassword}
        />
        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" className="mt-1" checked={values.terms} onChange={(event) => set('terms', event.target.checked)} />
          I agree to the SpendWise terms and privacy policy.
        </label>
        {errors.terms && <p className="text-xs text-danger">{errors.terms}</p>}
        {formError && <p className="text-sm text-danger">{formError}</p>}
        <Button type="submit" className="w-full" loading={submitting}>
          Create account
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
              onClick={async () => {
                setFormError('')
                setAuth0Submitting(true)
                try {
                  await loginWithAuth0('/dashboard')
                } catch (error) {
                  setFormError(formatAuth0Error(error))
                  setAuth0Submitting(false)
                }
              }}
            >
              Continue with Auth0
            </Button>
          </>
        )}
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
