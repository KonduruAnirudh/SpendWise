import { useState } from 'react'
import { Check, Circle } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { PasswordInput } from '../../../components/ui/PasswordInput'
import { useToast } from '../../../context/ToastContext'
import { PROFILE_API, profileService } from '../../../services/profileService'
import { PASSWORD_RULES, validatePasswordChange } from '../../../utils/validators'

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function ChangePasswordModal({ open, onClose }) {
  const { push } = useToast()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)

  // Passwords never outlive the dialog.
  function close() {
    setValues(EMPTY)
    setErrors({})
    setSubmitError('')
    onClose()
  }

  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    const nextErrors = validatePasswordChange(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    setSubmitError('')
    try {
      const result = await profileService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      push(result.changed ? 'Password changed.' : "Password changes aren't connected yet. Your password was not changed.")
      close()
    } catch (err) {
      // e.g. a 400/401 for a wrong current password once the endpoint exists.
      setSubmitError(err.message || "Your password couldn't be changed. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : close}
      title="Change password"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="change-password-form" loading={saving}>
            Change password
          </Button>
        </>
      }
    >
      <form id="change-password-form" className="space-y-4" onSubmit={submit} noValidate>
        {!PROFILE_API.changePassword && (
          <p className="rounded-xl border border-border bg-hover/60 px-3 py-2 text-sm text-muted">
            Preview: the server doesn't support password changes yet, so nothing will be changed.
          </p>
        )}
        <PasswordInput
          name="currentPassword"
          label="Current password"
          value={values.currentPassword}
          onChange={set('currentPassword')}
          error={errors.currentPassword}
          autoComplete="current-password"
          autoFocus
        />
        <PasswordInput
          name="newPassword"
          label="New password"
          value={values.newPassword}
          onChange={set('newPassword')}
          error={errors.newPassword}
          autoComplete="new-password"
        />
        <ul className="space-y-1" aria-label="Password requirements">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(values.newPassword)
            return (
              <li key={rule.id} className={`flex items-center gap-2 text-xs ${met ? 'text-success' : 'text-subtle'}`}>
                {met ? <Check className="size-3.5" aria-hidden="true" /> : <Circle className="size-3.5" aria-hidden="true" />}
                {rule.label}
                <span className="sr-only">{met ? '(met)' : '(not met yet)'}</span>
              </li>
            )
          })}
        </ul>
        <PasswordInput
          name="confirmPassword"
          label="Confirm new password"
          value={values.confirmPassword}
          onChange={set('confirmPassword')}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />
        {submitError && (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
            {submitError}
          </p>
        )}
      </form>
    </Modal>
  )
}
