import { forwardRef, useState } from 'react'
import { Lock, UserRound } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useToast } from '../../../context/ToastContext'
import { PROFILE_API, profileService } from '../../../services/profileService'
import { validateProfileName } from '../../../utils/validators'
import { PreviewNote, ProfileSection } from './ProfileSection'

export const PersonalInformation = forwardRef(function PersonalInformation(
  { profile, editing, onEditingChange, onSaved },
  ref,
) {
  const { push } = useToast()
  const [name, setName] = useState(profile.name || '')
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const changed = name.trim() !== (profile.name || '')

  function startEditing() {
    setName(profile.name || '')
    setError('')
    setSaveError('')
    onEditingChange(true)
  }

  async function save(event) {
    event.preventDefault()
    const problem = validateProfileName(name)
    setError(problem || '')
    if (problem) return
    setSaving(true)
    setSaveError('')
    try {
      const result = await profileService.updateProfile({ userId: profile.id, name: name.trim() })
      onSaved(result.profile)
      push(result.savedLocally ? 'Name updated on this device.' : 'Profile updated.')
      onEditingChange(false)
    } catch (err) {
      setSaveError(err.message || "Your changes couldn't be saved. Try again.")
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
      description="Your name as it appears to people in your groups."
      preview={!PROFILE_API.updateProfile}
    >
      {!editing ? (
        <div className="space-y-5">
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" value={profile.name || <span className="text-muted">Not set</span>} />
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
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={error}
              maxLength={100}
              autoComplete="name"
              autoFocus
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
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!PROFILE_API.updateProfile && (
              <PreviewNote>Saved on this device until profile sync is connected.</PreviewNote>
            )}
            <div className="flex shrink-0 gap-2 whitespace-nowrap sm:ml-auto">
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
