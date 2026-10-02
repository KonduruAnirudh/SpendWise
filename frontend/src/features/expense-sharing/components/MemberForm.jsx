import { Input } from '../../../components/ui/Input'
import { cn } from '../../../utils/cn'

const KINDS = [
  { value: 'user', label: 'SpendWise user' },
  { value: 'guest', label: 'Guest' },
]

// A SpendWise user is added by username, so the group shows up in their account too.
// A guest has no account: just a name, and only this group's members see them.
export function MemberForm({ values, onChange, errors }) {
  const set = (patch) => onChange({ ...values, ...patch })
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5" role="group" aria-label="Member type">
        {KINDS.map((kind) => (
          <button
            key={kind.value}
            type="button"
            aria-pressed={values.kind === kind.value}
            onClick={() => set({ kind: kind.value })}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              values.kind === kind.value
                ? 'border-accent bg-accent-muted text-accent'
                : 'border-border text-muted hover:border-accent/40 hover:text-fg',
            )}
          >
            {kind.label}
          </button>
        ))}
      </div>
      {values.kind === 'guest' ? (
        <Input
          name="guestName"
          label="Guest name"
          hint="For someone without a SpendWise account. Only this group sees them."
          value={values.name}
          onChange={(event) => set({ name: event.target.value })}
          error={errors.name}
          maxLength={100}
          autoComplete="off"
        />
      ) : (
        <Input
          name="memberUsername"
          label="Username"
          placeholder="@username"
          hint="Their SpendWise username. The group will appear in their account too."
          value={values.username}
          onChange={(event) => set({ username: event.target.value })}
          error={errors.username}
          maxLength={31}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      )}
    </div>
  )
}
