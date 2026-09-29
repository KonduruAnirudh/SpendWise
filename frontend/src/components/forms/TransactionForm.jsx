import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { PAYMENT_MODES, TRANSACTION_TYPES } from '../../utils/constants'

export function TransactionForm({ values, onChange, errors, categories, accounts }) {
  const selected = categories.find((category) => category.id === values.categoryId)
  const set = (key, value) => onChange({ ...values, [key]: value })

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        type="date"
        label="Date"
        value={values.date}
        onChange={(event) => set('date', event.target.value)}
        error={errors.date}
      />
      <Select label="Type" value={values.type} onChange={(event) => set('type', event.target.value)} error={errors.type}>
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
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <Select
        label="Sub-category"
        value={values.subcategoryId || ''}
        onChange={(event) => set('subcategoryId', event.target.value)}
      >
        <option value="">None</option>
        {(selected?.subcategories || []).map((sub) => (
          <option key={sub.id} value={sub.id}>
            {sub.name}
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
      <Select
        label="Payment mode"
        value={values.paymentMode}
        onChange={(event) => set('paymentMode', event.target.value)}
      >
        {PAYMENT_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {mode}
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
      <div className="sm:col-span-2">
        <Input
          label="Tags"
          hint="Comma separated"
          value={values.tags}
          onChange={(event) => set('tags', event.target.value)}
        />
      </div>
    </div>
  )
}
