import { Pencil } from 'lucide-react'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { currencySymbol, formatMonthYear } from '../../../utils/formatters'

export function ProfileHeader({ profile, accountCount, onEdit }) {
  const memberSince = profile.createdAt ? formatMonthYear(profile.createdAt) : null
  const facts = [
    { label: 'Member since', value: memberSince || '—' },
    { label: 'Currency', value: `${currencySymbol(profile.currency)} ${profile.currency || '—'}` },
    { label: 'Accounts', value: accountCount === null ? '—' : `${accountCount} linked` },
  ]

  return (
    <Card padding={false} className="overflow-hidden">
      {/* A quiet accent band gives the avatar something to sit on, without decoration. */}
      <div className="h-16 border-b border-border bg-accent-muted/60 sm:h-20" aria-hidden="true" />
      <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
          <Avatar name={profile.name || profile.email} className="-mt-9 size-18 text-xl ring-4 ring-card sm:-mt-10 sm:size-20 sm:text-2xl" />
          <div className="min-w-0 sm:pb-1">
            <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {profile.name || <span className="text-muted">Add your name</span>}
            </h2>
            {profile.username && <p className="mt-0.5 text-sm font-medium text-accent">@{profile.username}</p>}
            {/* Long addresses wrap instead of overflowing on small screens. */}
            <p className="mt-0.5 break-all text-sm text-muted">{profile.email}</p>
          </div>
        </div>
        <Button variant="outline" onClick={onEdit} className="w-full sm:w-auto">
          <Pencil className="size-4" aria-hidden="true" /> Edit profile
        </Button>
      </div>
      <dl className="grid grid-cols-3 border-t border-border">
        {facts.map((fact, index) => (
          <div key={fact.label} className={`min-w-0 px-4 py-3 sm:px-6 ${index > 0 ? 'border-l border-border' : ''}`}>
            <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">{fact.label}</dt>
            <dd className="mt-1 break-words text-sm font-medium text-fg">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
