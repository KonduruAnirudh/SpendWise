import { useState } from 'react'
import { Card, CardHeader } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { EmptyState } from '../../../components/ui/EmptyState'
import { expenseService } from '../../../services/expenseService'
import { formatCurrency } from '../../../utils/formatters'

export function GroupSettlements({ groupName, balances, settlements, onSettled }) {
  const [pending, setPending] = useState(null)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Group balances"
          description={`Visible to everyone in ${groupName || 'this group'}.`}
        />
        {!balances?.length ? (
          <p className="text-sm text-muted">No outstanding balances in this group.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {balances.map((item) => (
              <li key={`${item.groupId}-${item.fromId}-${item.toId}`} className="flex justify-between gap-3">
                <span className="text-muted">
                  {item.fromName} owes {item.toName}
                </span>
                <span className="font-medium">{formatCurrency(item.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Settlements" description="Any group member can review and mark these as settled." />
        {!settlements?.length ? (
          <EmptyState title="No settlements yet." description="Shared expenses in this group will appear here." />
        ) : (
          <ul className="space-y-3">
            {settlements.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm">
                  {item.fromName} → {item.toName}{' '}
                  <span className="font-semibold">{formatCurrency(item.amount)}</span>
                  {item.type === 'reimbursement' && (
                    <span className="ml-2 text-xs uppercase tracking-[0.14em] text-accent">Reimbursement</span>
                  )}
                </p>
                {item.status === 'settled' ? (
                  <span className="text-xs uppercase tracking-[0.14em] text-success">Settled</span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setPending(item)}>
                    Mark as settled
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="Mark as settled"
        description={`Confirm that ${pending?.fromName} paid ${formatCurrency(pending?.amount || 0)} to ${pending?.toName}. This will be visible to everyone in the group.`}
        confirmLabel="Mark as settled"
        onConfirm={async () => {
          await expenseService.settle(pending.id)
          setPending(null)
          onSettled?.()
        }}
      />
    </div>
  )
}
