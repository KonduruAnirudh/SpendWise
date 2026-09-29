import { formatCurrency } from '../../../utils/formatters'

// Split previews show paise, because that's what the server stores.
const money = (amount) => formatCurrency(amount, 'INR', { fractionDigits: 2 })

export function EqualSplit({ splits }) {
  return (
    <SplitList
      rows={splits}
      renderValue={(row) => <span className="text-muted">{money(row.amount)}</span>}
    />
  )
}

export function ExactSplit({ splits, amounts, onChange }) {
  return (
    <SplitList
      rows={splits}
      renderValue={(row) => (
        <NumberField
          value={amounts[row.personId] ?? row.amount}
          onChange={(value) => onChange(row.personId, value)}
          suffix="₹"
        />
      )}
    />
  )
}

export function PercentageSplit({ splits, percents, onChange }) {
  return (
    <SplitList
      rows={splits}
      renderValue={(row) => (
        <div className="flex items-center gap-3">
          <NumberField value={percents[row.personId] ?? row.percent} onChange={(value) => onChange(row.personId, value)} suffix="%" />
          <span className="w-24 text-right text-muted">{money(row.amount)}</span>
        </div>
      )}
    />
  )
}

export function SharesSplit({ splits, shares, onChange }) {
  return (
    <SplitList
      rows={splits}
      renderValue={(row) => (
        <div className="flex items-center gap-3">
          <NumberField value={shares[row.personId] ?? row.shares} onChange={(value) => onChange(row.personId, value)} />
          <span className="w-24 text-right text-muted">{money(row.amount)}</span>
        </div>
      )}
    />
  )
}

export function AdjustmentSplit({ splits, amounts, remaining, onChange }) {
  return (
    <div>
      <p className="mb-2 text-xs text-subtle">
        Enter an extra amount (+ or −) for anyone who should pay more or less. The rest is split equally.
      </p>
      <SplitList
        rows={splits}
        renderValue={(row) => (
          <div className="flex items-center gap-3">
            <NumberField
              value={amounts[row.personId] ?? 0}
              onChange={(value) => onChange(row.personId, value)}
              prefix="+₹"
              allowNegative
            />
            <span className="w-24 text-right text-muted">{money(row.amount)}</span>
          </div>
        )}
      />
      <p className={`mt-3 text-sm ${remaining >= 0 ? 'text-muted' : 'text-danger'}`}>
        {remaining >= 0
          ? `${money(remaining)} is split equally, then each extra is added.`
          : `Adjustments exceed the total by ${money(Math.abs(remaining))}.`}
      </p>
    </div>
  )
}

function SplitList({ rows, renderValue }) {
  if (!rows.length) {
    return <p className="text-sm text-muted">Add members to calculate a split.</p>
  }
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.personId} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
          <span>{row.name}</span>
          {renderValue(row)}
        </li>
      ))}
    </ul>
  )
}

function NumberField({ value, onChange, suffix, prefix, allowNegative = false }) {
  return (
    <label className="flex items-center gap-1">
      {(prefix || suffix === '₹') && <span className="text-subtle">{prefix || '₹'}</span>}
      <input
        type="number"
        min={allowNegative ? undefined : '0'}
        step="0.01"
        className="h-9 w-24 rounded-lg border border-border bg-surface px-2 text-right"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
      />
      {suffix === '%' && <span className="text-subtle">%</span>}
    </label>
  )
}
