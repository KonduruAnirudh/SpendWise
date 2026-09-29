import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { TRANSACTION_TYPES } from '../../utils/constants'

export function TransactionForm({ values, onChange, errors, categories, accounts }) {
  const set = (key, value) => onChange({ ...values, [key]: value })

  // The server derives a transaction's type from its category, so only offer matching categories.
  const matchesType = (category) => !category.type || category.type === values.type
  const options = categories.filter(matchesType)

  function setType(type) {
    const current = categories.find((category) => String(category.id) === String(values.categoryId))
    const keepCategory = current && (!current.type || current.type === type)
    onChange({ ...values, type, categoryId: keepCategory ? values.categoryId : '' })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        type="date"
        label="Date"
        value={values.date}
        onChange={(event) => set('date', event.target.value)}
        error={errors.date}
      />
      <Select label="Type" value={values.type} onChange={(event) => setType(event.target.value)} error={errors.type}>
        {TRANSACTION_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </Select>
      <Input
        type="number"
        label="Amount"
        value={values.amount}
        onChange={(event) => set('amount', event.target.value)}
        error={errors.amount}
      />
      <Input
        label="Description"
        value={values.description}
        onChange={(event) => set('description', event.target.value)}
        error={errors.description}
      />
      <Select
        label="Category"
        value={values.categoryId}
        onChange={(event) => set('categoryId', event.target.value)}
        error={errors.categoryId}
      >
        <option value="">Select category</option>
        {options.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <Select
        label="Account"
        value={values.accountId}
        onChange={(event) => set('accountId', event.target.value)}
        error={errors.accountId}
      >
        <option value="">Select account</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </Select>
      <div className="sm:col-span-2">
        <Input
          label="Notes"
          value={values.notes}
          onChange={(event) => set('notes', event.target.value)}
        />
      </div>
    </div>
  )
}
