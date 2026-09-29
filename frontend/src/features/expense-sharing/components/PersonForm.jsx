import { Input } from '../../../components/ui/Input'

export function PersonForm({ values, onChange, errors }) {
  const set = (key, value) => onChange({ ...values, [key]: value })
  return (
    <div className="space-y-4">
      <Input label="Name" value={values.name} onChange={(event) => set('name', event.target.value)} error={errors.name} />
      <Input
        label="Email"
        type="email"
        value={values.email || ''}
        onChange={(event) => set('email', event.target.value)}
        error={errors.email}
      />
      <Input label="Phone" value={values.phone || ''} onChange={(event) => set('phone', event.target.value)} />
    </div>
  )
}
