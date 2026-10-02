import { useAuth } from '../../../context/AuthContext'
import { formatCurrency } from '../../../utils/formatters'

// "You owe" / "You are owed" across groups: one line per currency, never mixed together.
export function SharingTotals({ totals, size = 'lg' }) {
  const { user } = useAuth()
  const rows = totals?.length ? totals : [{ currency: user?.currency, youOwe: 0, youAreOwed: 0 }]
  const valueClass = size === 'lg' ? 'text-2xl font-semibold' : 'text-xl font-semibold'
  return (
    <div className="flex flex-wrap gap-8">
      {[
        { label: 'You owe', key: 'youOwe' },
        { label: 'You are owed', key: 'youAreOwed' },
      ].map(({ label, key }) => (
        <div key={key}>
          <p className="text-xs text-muted">{label}</p>
          {rows.map((row) => (
            <p key={row.currency} className={valueClass}>
              {formatCurrency(row[key], row.currency, { fractionDigits: 2 })}
            </p>
          ))}
        </div>
      ))}
    </div>
  )
}
