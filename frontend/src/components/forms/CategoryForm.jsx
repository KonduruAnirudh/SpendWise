import { Input } from '../ui/Input'

export function CategoryForm({ values, onChange, errors }) {
  return (
    <div className="space-y-4">
      <Input
        label="Category name"
        value={values.name}
        onChange={(event) => onChange({ ...values, name: event.target.value })}
        error={errors.name}
      />
      <Input
        label="Color"
        type="color"
        className="h-12 cursor-pointer p-1"
        value={values.color || '#d4af37'}
        onChange={(event) => onChange({ ...values, color: event.target.value })}
      />
      <Input
        label="Sub-category"
        hint="Optional. Added to this category."
        value={values.subcategory || ''}
        onChange={(event) => onChange({ ...values, subcategory: event.target.value })}
      />
    </div>
  )
}
