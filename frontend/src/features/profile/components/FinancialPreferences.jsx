import { useState } from 'react'
import { Lock, Wallet } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { useToast } from '../../../context/ToastContext'
import { profileService } from '../../../services/profileService'
import { currencySymbol } from '../../../utils/formatters'
import { normalizeAmountInput, validateMonthlyBudget } from '../../../utils/validators'
import { PreviewNote, ProfileSection } from './ProfileSection'
import { FormSkeleton, LoadError } from './SectionStates'

function toForm(preferences) {
  return {
    defaultAccountId: preferences.defaultAccountId ? String(preferences.defaultAccountId) : '',
    monthlyBudget: preferences.monthlyBudget ?? '',
  }
}

export function FinancialPreferences({ currency, preferences, accounts, onSaved }) {
  return (
    <ProfileSection
      id="financial-preferences"
      icon={Wallet}
      title="Financial preferences"
      description="Defaults SpendWise uses when you add transactions and track your budget."
    >
      {preferences.loading ? (
        <FormSkeleton rows={3} />
      ) : preferences.error ? (
        <LoadError onRetry={preferences.refetch} />
      ) : (
        <FinancialPreferencesForm
          // Remount when saved values change, so the form starts from them.
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

function FinancialPreferencesForm({ currency, initial, accounts, onSaved }) {
  const { push } = useToast()
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const symbol = currencySymbol(currency)
  const changed = JSON.stringify(form) !== JSON.stringify(initial)

  async function save(event) {
    event.preventDefault()
    const budgetError = validateMonthlyBudget(form.monthlyBudget)
    setErrors(budgetError ? { monthlyBudget: budgetError } : {})
    if (budgetError) return
    setSaving(true)
    setSaveError('')
    try {
      const saved = await profileService.updatePreferences({
        defaultAccountId: form.defaultAccountId ? Number(form.defaultAccountId) : '',
        monthlyBudget: normalizeAmountInput(form.monthlyBudget) === '' ? null : Number(normalizeAmountInput(form.monthlyBudget)),
      })
      onSaved(saved)
      push('Financial preferences saved.')
    } catch (err) {
      setSaveError(err.message || "Your preferences couldn't be saved. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={save} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="currency"
          label="Default currency"
          value={`${symbol}  ${currency}`}
          readOnly
          aria-readonly="true"
          className="cursor-not-allowed text-muted"
          hint="Change it under Personal information (Edit profile): your amounts are converted."
          rightSlot={<Lock className="mr-1.5 size-4 text-subtle" aria-hidden="true" />}
        />
        <Select
          name="defaultAccountId"
          label="Default account"
          value={form.defaultAccountId}
          onChange={(event) => setForm({ ...form, defaultAccountId: event.target.value })}
          hint={accounts.error ? "Accounts couldn't be loaded." : 'Pre-selected when you add a transaction.'}
          disabled={accounts.loading || Boolean(accounts.error)}
        >
          <option value="">{accounts.loading ? 'Loading accounts…' : 'No default'}</option>
          {(accounts.data || []).map((account) => (
            <option key={account.id} value={String(account.id)}>
              {account.name}
            </option>
          ))}
        </Select>
        <div className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
          <Input
            name="monthlyBudget"
            label={`Monthly budget (${symbol})`}
            inputMode="decimal"
            placeholder="e.g. 30,000"
            value={form.monthlyBudget}
            onChange={(event) => setForm({ ...form, monthlyBudget: event.target.value })}
            error={errors.monthlyBudget}
            hint="Optional. When you track expenses only, the dashboard shows what's left of it."
          />
        </div>
      </div>
      {saveError && (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
          {saveError}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PreviewNote>Saved on this device.</PreviewNote>
        <Button type="submit" loading={saving} disabled={!changed} className="shrink-0 whitespace-nowrap sm:ml-auto">
          Save preferences
        </Button>
      </div>
    </form>
  )
}
