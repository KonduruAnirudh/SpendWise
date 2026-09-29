import { formatCurrency } from '../../../utils/formatters'

export function EqualSplit({ splits }) {
  return (
    <SplitList
      rows={splits}
      renderValue={(row) => <span className="text-muted">{formatCurrency(row.amount)}</span>}
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
          <span className="w-20 text-right text-muted">{formatCurrency(row.amount)}</span>
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
          <span className="w-20 text-right text-muted">{formatCurrency(row.amount)}</span>
        </div>
      )}
    />
  )
}

export function AdjustmentSplit({ splits, amounts, remaining, onChange }) {
  return (
    <div>
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
      <p className={`mt-3 text-sm ${remaining === 0 ? 'text-success' : 'text-danger'}`}>
        {remaining === 0 ? 'Remaining: ₹0' : `Amount remaining: ${formatCurrency(remaining)}`}
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

function NumberField({ value, onChange, suffix }) {
  return (
    <label className="flex items-center gap-1">
      {suffix === '₹' && <span className="text-subtle">₹</span>}
      <input
        type="number"
        min="0"
        className="h-9 w-24 rounded-lg border border-border bg-surface px-2 text-right"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
      />
      {suffix === '%' && <span className="text-subtle">%</span>}
    </label>
  )
}
