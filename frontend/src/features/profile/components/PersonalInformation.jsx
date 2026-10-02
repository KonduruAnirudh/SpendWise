import { forwardRef, useState } from 'react'
import { Lock, UserRound } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useToast } from '../../../context/ToastContext'
import { profileService } from '../../../services/profileService'
import { normalizeUsername, USERNAME_RULE, validateProfileName, validateUsername } from '../../../utils/validators'
import { ProfileSection } from './ProfileSection'

export const PersonalInformation = forwardRef(function PersonalInformation(
  { profile, editing, onEditingChange, onSaved },
  ref,
) {
  const { push } = useToast()
  const [values, setValues] = useState({ name: profile.name || '', username: profile.username || '' })
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const changed =
    values.name.trim() !== (profile.name || '') || normalizeUsername(values.username) !== (profile.username || '')

  function startEditing() {
    setValues({ name: profile.name || '', username: profile.username || '' })
    setErrors({})
    setSaveError('')
    onEditingChange(true)
  }

  async function save(event) {
    event.preventDefault()
    const nextErrors = {}
    const nameProblem = validateProfileName(values.name)
    const usernameProblem = validateUsername(values.username)
    if (nameProblem) nextErrors.name = nameProblem
    if (usernameProblem) nextErrors.username = usernameProblem
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    setSaveError('')
    try {
      const saved = await profileService.updateProfile({
        name: values.name.trim(),
        username: normalizeUsername(values.username),
      })
      onSaved(saved)
      push('Profile updated.')
      onEditingChange(false)
    } catch (err) {
      // A taken username (409) belongs next to the username field.
      if (err.status === 409) setErrors({ username: err.message })
      else setSaveError(err.message || "Your changes couldn't be saved. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProfileSection
      ref={ref}
      id="personal-information"
      icon={UserRound}
      title="Personal information"
      description="Your name and the username people use to add you to groups."
    >
      {!editing ? (
        <div className="space-y-5">
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" value={profile.name || <span className="text-muted">Not set</span>} />
            <Field label="Username" value={profile.username ? `@${profile.username}` : '—'} />
            <Field
              label="Email"
              value={
                <span className="inline-flex max-w-full items-center gap-1.5">
                  <span className="break-all">{profile.email}</span>
                  <Lock className="size-3.5 shrink-0 text-subtle" aria-label="Read-only" />
                </span>
              }
            />
          </dl>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={startEditing}>
              Edit
            </Button>
          </div>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={save} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="fullName"
              label="Full name"
              value={values.name}
              onChange={(event) => setValues({ ...values, name: event.target.value })}
              error={errors.name}
              maxLength={100}
              autoComplete="name"
              autoFocus
            />
            <Input
              name="username"
              label="Username"
              placeholder="@username"
              value={values.username}
              onChange={(event) => setValues({ ...values, username: event.target.value.replace(/\s/g, '').toLowerCase() })}
              error={errors.username}
              hint={USERNAME_RULE}
              maxLength={31}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
            <Input
              name="email"
              label="Email"
              type="email"
              value={profile.email}
              readOnly
              aria-readonly="true"
              className="cursor-not-allowed text-muted"
              hint="You sign in with this email, so it can't be changed yet."
              rightSlot={<Lock className="mr-1.5 size-4 text-subtle" aria-hidden="true" />}
            />
          </div>
          {saveError && (
            <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
              {saveError}
            </p>
          )}
          <div className="flex justify-end">
            <div className="flex shrink-0 gap-2 whitespace-nowrap">
              <Button type="button" variant="ghost" onClick={() => onEditingChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} disabled={!changed}>
                Save changes
              </Button>
            </div>
          </div>
        </form>
      )}
    </ProfileSection>
  )
})

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1.5 text-sm text-fg">{value}</dd>
    </div>
  )
}
