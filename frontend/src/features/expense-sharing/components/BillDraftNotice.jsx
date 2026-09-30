import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatCurrency, formatDate } from '../../../utils/formatters'
import { toPaise } from '../../../utils/splitCalculations'

const money = (amount, currency) => formatCurrency(amount, currency || 'INR', { fractionDigits: 2 })

// Shown above the itemized form while a bill draft is being reviewed. `linesTotal` is live, so the
// check updates as the user edits lines.
export function BillDraftNotice({ draft, linesTotal }) {
  const difference = draft.total === null ? null : toPaise(draft.total) - toPaise(linesTotal)
  const matches = difference !== null && Math.abs(difference) <= 100

  return (
    <div className="space-y-3 rounded-xl border border-border bg-hover/40 p-3 text-sm">
      <p className="text-muted">
        Read from the bill{draft.merchant ? ` at ${draft.merchant}` : ''}
        {draft.billDate ? ` on ${formatDate(draft.billDate, 'long')}` : ''}. Check every line and assign it before saving.
      </p>
      {draft.total !== null && (
        <p className={`flex items-center gap-2 ${matches ? 'text-success' : 'text-danger'}`}>
          {matches ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
          Receipt total {money(draft.total, draft.currency)} · your lines {money(linesTotal, draft.currency)}
        </p>
      )}
      {draft.warnings.length > 0 && (
        <div className="rounded-lg border border-danger/30 bg-card p-3" role="alert">
          <p className="mb-1 flex items-center gap-2 font-medium text-danger">
            <AlertTriangle className="size-4" /> Please check
          </p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {draft.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
