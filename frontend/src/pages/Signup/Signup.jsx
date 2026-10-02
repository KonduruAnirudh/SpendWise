import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { authService } from '../../services/authService'
import { useToast } from '../../context/ToastContext'
import { normalizeUsername, USERNAME_RULE, validateSignup } from '../../utils/validators'

export function SignupPage() {
  const navigate = useNavigate()
  const { push } = useToast()
  const [values, setValues] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validateSignup(values)
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      await authService.signup({ ...values, username: normalizeUsername(values.username) })
      push('Account created. Please sign in.')
      navigate('/login')
    } catch (error) {
      // A taken username belongs next to its field; anything else goes under the form.
      if (error.status === 409 && /username/i.test(error.message)) setErrors({ username: error.message })
      else setFormError(error.message || 'Unable to create account.')
    } finally {
      setSubmitting(false)
    }
  }

  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }))

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <Input label="Full name" value={values.name} onChange={(event) => set('name', event.target.value)} error={errors.name} />
        <Input
          label="Username"
          placeholder="@username"
          value={values.username}
          onChange={(event) => set('username', event.target.value.replace(/\s/g, '').toLowerCase())}
          error={errors.username}
          hint={`Friends add you to groups with this. ${USERNAME_RULE}`}
          maxLength={31}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
        />
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
