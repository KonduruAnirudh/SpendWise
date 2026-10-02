import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { useToast } from '../../../context/ToastContext'
import { profileService } from '../../../services/profileService'
import { currencyName, DATE_FORMATS, INCOME_TRACKING_OPTIONS } from '../../../utils/constants'
import { currencySymbol, formatDate } from '../../../utils/formatters'
import { normalizeAmountInput, validateMonthlyBudget } from '../../../utils/validators'
import { PreviewNote, ProfileSection } from '../../profile/components/ProfileSection'
import { FormSkeleton, LoadError } from '../../profile/components/SectionStates'

function toForm(preferences) {
  return {
    dateFormat: preferences.dateFormat || 'dd MMM',
    defaultAccountId: preferences.defaultAccountId ? String(preferences.defaultAccountId) : '',
    incomeTracking: preferences.incomeTracking || '',
    monthlyBudget: preferences.monthlyBudget == null ? '' : String(preferences.monthlyBudget),
  }
}

export function PreferenceSettings({ currency, preferences, accounts, onSaved }) {
  return (
    <ProfileSection
      id="preferences"
      icon={SlidersHorizontal}
      title="Preferences"
      description="How dates look, which account new transactions use, and how your dashboard reads your money."
    >
      {preferences.loading ? (
        <FormSkeleton rows={4} />
      ) : preferences.error ? (
        <LoadError onRetry={preferences.refetch} />
      ) : (
        <PreferenceForm
          key={JSON.stringify(toForm(preferences.data))}
          currency={currency}
          initial={toForm(preferences.data)}
          accounts={accounts}
          onSaved={onSaved}
        />
      )}
    </ProfileSection>
  )
}

function PreferenceForm({ currency, initial, accounts, onSaved }) {
  const { push } = useToast()
  const [form, setForm] = useState(initial)
  const [budgetError, setBudgetError] = useState('')
  const [saving, setSaving] = useState(false)
  const changed = JSON.stringify(form) !== JSON.stringify(initial)
  const tracking = INCOME_TRACKING_OPTIONS.find((option) => option.value === form.incomeTracking)

  async function save(event) {
    event.preventDefault()
    const problem = form.incomeTracking === 'none' ? validateMonthlyBudget(form.monthlyBudget) : null
    setBudgetError(problem || '')
    if (problem) return
    setSaving(true)
    try {
      const budget = normalizeAmountInput(form.monthlyBudget)
      const saved = await profileService.updatePreferences({
        dateFormat: form.dateFormat,
        defaultAccountId: form.defaultAccountId ? Number(form.defaultAccountId) : '',
        incomeTracking: form.incomeTracking,
        // A budget only applies when you track expenses only (the dashboard shows what's left of it).
        monthlyBudget: form.incomeTracking === 'none' && budget ? Number(budget) : null,
      })
      onSaved(saved)
      push('Preferences saved.')
    } catch (err) {
      push(err.message || "Your preferences couldn't be saved. Try again.", 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={save} noValidate>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Currency</p>
          <p className="mt-1 text-sm text-fg">
            {currencySymbol(currency)} {currency} · {currencyName(currency)}
          </p>
        </div>
        <Link to="/profile" className="text-sm font-medium text-accent hover:underline">
          Change in Profile →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="dateFormat"
          label="Date format"
          value={form.dateFormat}
          onChange={(event) => setForm({ ...form, dateFormat: event.target.value })}
          hint={`Today shows as ${formatDate(new Date(), form.dateFormat)}.`}
        >
          {DATE_FORMATS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select
          name="defaultAccountId"
          label="Default account"
          value={form.defaultAccountId}
          onChange={(event) => setForm({ ...form, defaultAccountId: event.target.value })}
          disabled={accounts.loading}
          hint="Pre-selected when you add a transaction."
        >
          <option value="">No default</option>
          {(accounts.data || []).map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
        <Select
          name="incomeTracking"
          label="Do you track income?"
          value={form.incomeTracking}
          onChange={(event) => setForm({ ...form, incomeTracking: event.target.value })}
          hint={tracking?.description || 'Changes how your dashboard is laid out.'}
        >
          <option value="">Not set</option>
          {INCOME_TRACKING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {form.incomeTracking === 'none' && (
          <Input
            name="monthlyBudget"
            label={`Monthly budget (${currencySymbol(currency)})`}
            inputMode="decimal"
            placeholder="e.g. 30,000"
            value={form.monthlyBudget}
            onChange={(event) => setForm({ ...form, monthlyBudget: event.target.value })}
            error={budgetError}
            hint="Optional. The dashboard shows what's left of it."
          />
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PreviewNote>Saved on this device.</PreviewNote>
        <Button type="submit" loading={saving} disabled={!changed} className="shrink-0 whitespace-nowrap sm:ml-auto">
          Save preferences
        </Button>
      </div>
    </form>
  )
}
