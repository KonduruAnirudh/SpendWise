import { X } from 'lucide-react'
import { Avatar } from '../../../components/ui/Avatar'

// Member chips with an optional remove button (group page and create-group modal).
export function SelectedMembers({ members, onRemove }) {
  if (!members.length) {
    return <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">No members selected</p>
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {members.map((member) => (
        <li key={member.id} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">
          <Avatar name={member.name} className="size-5 text-[9px]" />
          {member.name}
          {onRemove && (
            <button type="button" onClick={() => onRemove(member.id)} className="text-muted hover:text-fg" aria-label={`Remove ${member.name}`}>
              <X className="size-3.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
