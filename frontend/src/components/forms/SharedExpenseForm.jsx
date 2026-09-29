import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { SPLIT_METHODS } from '../../utils/constants'
import { formatCurrency } from '../../utils/formatters'

export function SharedExpenseForm({ values, onChange, errors, members, splits, onSplitChange }) {
  const set = (key, value) => onChange({ ...values, [key]: value })

  return (
    <div className="space-y-4">
      <Input label="Expense name" value={values.name} onChange={(event) => set('name', event.target.value)} error={errors.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="number" label="Amount" value={values.amount} onChange={(event) => set('amount', event.target.value)} error={errors.amount} />
        <Input type="date" label="Date" value={values.date} onChange={(event) => set('date', event.target.value)} />
      </div>
      <Select label="Paid by" value={values.paidBy} onChange={(event) => set('paidBy', event.target.value)} error={errors.paidBy}>
        <option value="">Select member</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </Select>
      <Select
        label="Split method"
        value={values.splitMethod}
        onChange={(event) => set('splitMethod', event.target.value)}
      >
        {SPLIT_METHODS.map((method) => (
          <option key={method.value} value={method.value}>
            {method.label}
          </option>
        ))}
      </Select>

      <div className="rounded-xl border border-border p-3">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted">Members</p>
        <ul className="space-y-2">
          {splits.map((split) => (
            <li key={split.memberId} className="flex items-center justify-between gap-3 text-sm">
              <span>{split.name}</span>
              {values.splitMethod === 'percentage' ? (
                <input
                  type="number"
                  className="h-9 w-24 rounded-lg border border-border bg-surface px-2 text-right"
                  value={split.percent}
                  onChange={(event) => onSplitChange(split.memberId, { percent: Number(event.target.value) })}
                />
              ) : values.splitMethod === 'exact' ? (
                <input
                  type="number"
                  className="h-9 w-28 rounded-lg border border-border bg-surface px-2 text-right"
                  value={split.amount}
                  onChange={(event) => onSplitChange(split.memberId, { amount: Number(event.target.value) })}
                />
              ) : (
                <span className="text-muted">{formatCurrency(split.amount)}</span>
              )}
            </li>
          ))}
        </ul>
        {errors.splits && <p className="mt-2 text-xs text-danger">{errors.splits}</p>}
      </div>
    </div>
  )
}
