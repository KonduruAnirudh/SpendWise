import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { formatCurrency } from '../../utils/formatters'

export function CategorySuggestion({ row, categories, accounts, onChange, onAccept, onRemove }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium">{row.description}</p>
          <p className="text-xs text-muted">
            {row.date} · {row.type} · {formatCurrency(row.amount)}
          </p>
          <p className="mt-2 text-sm text-muted">
            AI suggestion:{' '}
            <span className="text-fg">
              {row.suggestedCategory}
              {row.suggestedSubcategory ? ` → ${row.suggestedSubcategory}` : ''}
            </span>
          </p>
        </div>
        <Badge tone={row.accepted ? 'success' : 'accent'}>{row.accepted ? 'Accepted' : 'Review'}</Badge>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Select value={row.suggestedCategory} onChange={(event) => onChange({ suggestedCategory: event.target.value })}>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select value={row.suggestedAccount} onChange={(event) => onChange({ suggestedAccount: event.target.value })}>
          {accounts.map((account) => (
            <option key={account.id} value={account.name}>
              {account.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={onAccept}>
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={() => onChange({ accepted: false })}>
          Change
        </Button>
        <Button size="sm" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </article>
  )
}
