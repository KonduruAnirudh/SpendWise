import { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { peopleService } from '../../../services/peopleService'

export function PeoplePicker({ selectedIds, onToggle, onCreate }) {
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState([])

  useEffect(() => {
    peopleService.list().then(setPeople)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return people.filter(
      (person) => !q || person.name.toLowerCase().includes(q) || person.email?.toLowerCase().includes(q),
    )
  }, [people, query])

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Add existing person</p>
      <Input
        placeholder="Search people..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        rightSlot={<Search className="mr-1 size-4 text-subtle" />}
      />
      <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
        {results.length === 0 && <p className="px-2 py-3 text-sm text-muted">No people match this search.</p>}
        {results.map((person) => {
          const selected = selectedIds.includes(person.id)
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => onToggle(person)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-hover"
            >
              <span className="flex items-center gap-2">
                <Avatar name={person.name} className="size-7 text-[10px]" />
                <span>
                  <span className="block font-medium">{person.name}</span>
                  <span className="block text-xs text-subtle">{person.email}</span>
                </span>
              </span>
              <span className={`text-xs ${selected ? 'text-accent' : 'text-muted'}`}>{selected ? 'Selected' : 'Select'}</span>
            </button>
          )
        })}
      </div>
      {onCreate && (
        <Button type="button" variant="outline" size="sm" onClick={onCreate}>
          <UserPlus className="size-3.5" /> Create new person
        </Button>
      )}
    </div>
  )
}

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
