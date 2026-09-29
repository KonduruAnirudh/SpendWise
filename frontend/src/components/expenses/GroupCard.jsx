import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { Avatar } from '../ui/Avatar'

export function GroupCard({ group }) {
  const owed = group.yourBalance >= 0
  return (
    <Link to={`/groups/${group.id}`}>
      <Card className="h-full transition-colors hover:border-accent/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">{group.name}</h3>
            <p className="mt-1 text-sm text-muted">{group.members.length} members</p>
          </div>
          <div className="flex -space-x-2">
            {group.members.slice(0, 4).map((member) => (
              <Avatar key={member.id} name={member.name} className="ring-2 ring-card" />
            ))}
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-subtle">Total expenses</dt>
            <dd className="mt-1 font-medium">{formatCurrency(group.totalExpenses)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-subtle">Your balance</dt>
            <dd className={`mt-1 font-medium ${owed ? 'text-success' : 'text-danger'}`}>
              {owed ? `+ ${formatCurrency(group.yourBalance)}` : `− ${formatCurrency(Math.abs(group.yourBalance))}`}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-subtle">Last activity {formatDate(group.lastActivity)}</p>
      </Card>
    </Link>
  )
}
