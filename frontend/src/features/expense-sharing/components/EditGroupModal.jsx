import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { Switch } from '../../../components/ui/Switch'
import { CurrencySelect } from '../../../components/forms/CurrencySelect'
import { ConversionNotice, useConversionRate } from '../../currency/ConversionNotice'
import { useToast } from '../../../context/ToastContext'
import { groupService } from '../../../services/groupService'

// Owner-only group settings. Members are managed separately ("Manage members").
export function EditGroupModal({ open, group, onClose, onSaved }) {
  return open ? <EditGroupForm group={group} onClose={onClose} onSaved={onSaved} /> : null
}

function EditGroupForm({ group, onClose, onSaved }) {
  const { push } = useToast()
  const [values, setValues] = useState({ name: group.name, simplifyDebts: group.simplifyDebts, currency: group.currency })
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const currencyChanged = values.currency !== group.currency
  const changed = values.name.trim() !== group.name || values.simplifyDebts !== group.simplifyDebts || currencyChanged
  const rate = useConversionRate(currencyChanged ? group.currency : null, values.currency)
  const rateReady = !currencyChanged || (rate.data?.quote === values.currency && !rate.error)

  async function save(event) {
    event.preventDefault()
    if (!values.name.trim()) {
      setError('Group name is required.')
      return
    }
    setError('')
    setSaveError('')
    setSaving(true)
    try {
      await groupService.update(group.id, {
        name: values.name.trim(),
        simplifyDebts: values.simplifyDebts,
        currency: currencyChanged ? values.currency : undefined,
      })
      push(currencyChanged ? `Group converted to ${values.currency}.` : 'Group updated.')
      onSaved()
      onClose()
    } catch (err) {
      setSaveError(err.message || "The group couldn't be updated. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={saving ? () => {} : onClose}
      title="Edit group"
      className="sm:max-w-lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-group-form" loading={saving} disabled={!changed || !rateReady}>
            {currencyChanged ? 'Convert and save' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id="edit-group-form" className="space-y-5" onSubmit={save} noValidate>
        <Input
          name="groupName"
          label="Group name"
          value={values.name}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
          error={error}
          maxLength={100}
          autoFocus
        />
        <CurrencySelect
          name="groupCurrency"
          label="Currency"
          value={values.currency}
          onChange={(event) => setValues({ ...values, currency: event.target.value })}
          hint="Everyone in the group sees amounts in this currency."
        />
        <ConversionNotice
          from={group.currency}
          to={values.currency}
          rate={rate}
          scope="Every expense, split and settlement in this group is converted, for everyone in it."
        />
        <Switch
          checked={values.simplifyDebts}
          onChange={(checked) => setValues({ ...values, simplifyDebts: checked })}
          label="Simplify debts"
          description="Off: everyone pays the people who actually paid for them. On: SpendWise combines debts into the fewest payments, so you may pay someone you didn't share a bill with."
        />
        {saveError && (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
            {saveError}
          </p>
        )}
      </form>
    </Modal>
  )
}
