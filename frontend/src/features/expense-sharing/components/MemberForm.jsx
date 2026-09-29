import { Input } from '../../../components/ui/Input'

// A registered SpendWise user is added by email; anyone else joins as a guest with just a name.
export function MemberForm({ values, onChange, errors }) {
  const set = (key, value) => onChange({ ...values, [key]: value })
  return (
    <div className="space-y-4">
      <Input
        label="Name"
        hint="Guests only need a name."
        value={values.name}
        onChange={(event) => set('name', event.target.value)}
        error={errors.name}
      />
      <Input
        label="Email (optional)"
        type="email"
        hint="For people with a SpendWise account, so the group shows up for them too."
        value={values.email}
        onChange={(event) => set('email', event.target.value)}
        error={errors.email}
      />
    </div>
  )
}
