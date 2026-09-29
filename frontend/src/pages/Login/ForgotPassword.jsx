import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../context/ToastContext'
import { useState } from 'react'

export function ForgotPasswordPage() {
  const { push } = useToast()
  const [email, setEmail] = useState('')

  return (
    <form
      className="space-y-4 rounded-2xl border border-border bg-card p-6"
      onSubmit={(event) => {
        event.preventDefault()
        push('If an account exists, a reset link will be sent.')
      }}
    >
      <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Button type="submit" className="w-full">
        Send reset link
      </Button>
      <p className="text-center text-sm text-muted">
        <Link to="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
