import { Pencil, Trash2 } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { ACCOUNT_TYPES } from '../../utils/constants'

export function AccountCard({ account, recent, onEdit, onDelete }) {
  const typeLabel = ACCOUNT_TYPES.find((item) => item.value === account.type)?.label || account.type

  return (
    <Card className="flex flex-col justify-between transition-colors hover:border-accent/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">{typeLabel}</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">{account.name}</h3>
          {account.institution && <p className="text-sm text-muted">{account.institution}</p>}
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={onEdit} className="rounded-lg p-1.5 text-muted hover:bg-hover" aria-label="Edit account">
            <Pencil className="size-4" />
          </button>
          <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-danger" aria-label="Delete account">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <p className="mt-6 text-2xl font-semibold tracking-tight">{formatCurrency(account.balance)}</p>
      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <p className="text-xs uppercase tracking-[0.14em] text-subtle">Recent</p>
        {recent.length === 0 && <p className="text-sm text-muted">No recent transactions.</p>}
        {recent.slice(0, 3).map((txn) => (
          <div key={txn.id} className="flex items-center justify-between text-sm">
            <span className="text-muted">
              {txn.description} · {formatDate(txn.date)}
            </span>
            <Badge tone={txn.type === 'income' ? 'success' : 'neutral'}>
              {txn.type === 'income' ? '+' : '−'}
              {formatCurrency(txn.amount)}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  )
}
