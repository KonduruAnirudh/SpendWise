import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { Switch } from '../../../components/ui/Switch'
import { useToast } from '../../../context/ToastContext'
import { profileService } from '../../../services/profileService'
import { AI_RESPONSE_STYLES } from '../../../utils/constants'
import { PreviewNote, ProfileSection } from './ProfileSection'
import { FormSkeleton, LoadError } from './SectionStates'

function toForm(preferences) {
  return { aiAnalysisEnabled: preferences.aiAnalysisEnabled, aiResponseStyle: preferences.aiResponseStyle }
}

export function AIAssistantPreferences({ preferences, onSaved }) {
  return (
    <ProfileSection
      id="ai-assistant"
      icon={Sparkles}
      title="AI financial assistant"
      description="The assistant answers questions by looking up your transactions, balances and groups."
      preview
    >
      {preferences.loading ? (
        <FormSkeleton rows={2} />
      ) : preferences.error ? (
        <LoadError onRetry={preferences.refetch} />
      ) : (
        <AIPreferencesForm
          key={JSON.stringify(toForm(preferences.data))}
          initial={toForm(preferences.data)}
          onSaved={onSaved}
        />
      )}
    </ProfileSection>
  )
}

function AIPreferencesForm({ initial, onSaved }) {
  const { push } = useToast()
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const changed = JSON.stringify(form) !== JSON.stringify(initial)
  const style = AI_RESPONSE_STYLES.find((option) => option.value === form.aiResponseStyle)

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setSaveError('')
    try {
      onSaved(await profileService.updatePreferences(form))
      push('AI preferences saved on this device.')
    } catch (err) {
      setSaveError(err.message || "Your preferences couldn't be saved. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={save} noValidate>
      <Switch
        checked={form.aiAnalysisEnabled}
        onChange={(checked) => setForm({ ...form, aiAnalysisEnabled: checked })}
        label="Allow transaction analysis"
        description="Let the assistant read your transactions and balances to answer questions. It can only read your own data."
      />
      <div className="sm:max-w-xs">
        <Select
          name="aiResponseStyle"
          label="Response style"
          value={form.aiResponseStyle}
          onChange={(event) => setForm({ ...form, aiResponseStyle: event.target.value })}
          hint={style?.description}
        >
          {AI_RESPONSE_STYLES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      {saveError && (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
          {saveError}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PreviewNote>Saved on this device. The assistant will use these once it supports them.</PreviewNote>
        <Button type="submit" loading={saving} disabled={!changed} className="shrink-0 whitespace-nowrap sm:ml-auto">
          Save preferences
        </Button>
      </div>
    </form>
  )
}
