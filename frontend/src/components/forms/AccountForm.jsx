import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { ACCOUNT_TYPES } from '../../utils/constants'

export function AccountForm({ values, onChange, errors }) {
  const set = (key, value) => onChange({ ...values, [key]: value })

  return (
    <div className="space-y-4">
      <Input label="Account name" value={values.name} onChange={(event) => set('name', event.target.value)} error={errors.name} />
      <Select label="Type" value={values.type} onChange={(event) => set('type', event.target.value)} error={errors.type}>
        {ACCOUNT_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </Select>
      <Input
        type="number"
        label="Current balance"
        value={values.balance}
        onChange={(event) => set('balance', event.target.value)}
        error={errors.balance}
      />
      <Input
        label="Institution"
        value={values.institution || ''}
        onChange={(event) => set('institution', event.target.value)}
      />
    </div>
  )
}
