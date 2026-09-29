import { useState } from 'react'
import { Card, CardHeader } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useToast } from '../../../context/ToastContext'
import { expenseService } from '../../../services/expenseService'
import { formatCurrency, formatDate } from '../../../utils/formatters'

const money = (amount) => formatCurrency(amount, 'INR', { fractionDigits: 2 })

// net = paid − share + settlements sent − settlements received (computed on the server).
function describeNet(net) {
  if (net > 0) return { text: `gets back ${money(net)}`, tone: 'text-success' }
  if (net < 0) return { text: `owes ${money(Math.abs(net))}`, tone: 'text-danger' }
  return { text: 'is settled up', tone: 'text-muted' }
}

export function GroupSettlements({ groupName, balances, settlements, onSettled }) {
  const { push } = useToast()
  const [pending, setPending] = useState(null)
  const [undoing, setUndoing] = useState(null)
  const [busy, setBusy] = useState(false)

  async function run(action, success) {
    setBusy(true)
    try {
      await action()
      push(success)
      onSettled?.()
    } catch (error) {
      push(error.message, 'error')
    } finally {
      setBusy(false)
      setPending(null)
      setUndoing(null)
    }
  }

  const open = (settlements || []).filter((item) => item.status !== 'settled')
  const recorded = (settlements || []).filter((item) => item.status === 'settled')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Group balances" description={`Everyone's position in ${groupName || 'this group'}.`} />
        {!balances?.length ? (
          <p className="text-sm text-muted">No members yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {balances.map((item) => {
              const { text, tone } = describeNet(item.net)
              return (
                <li key={item.memberId} className="flex justify-between gap-3">
                  <span className="text-muted">
                    {item.name}
                    {item.isMe ? ' (you)' : ''}
                  </span>
                  <span className={`font-medium ${tone}`}>{text}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Settle up"
          description="The fewest payments that clear every balance. Record one when it's been paid."
        />
        {!open.length ? (
          <EmptyState title="Everyone is settled up." description="New shared expenses will show suggested payments here." />
        ) : (
          <ul className="space-y-3">
            {open.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm">
                  {item.fromName} → {item.toName} <span className="font-semibold">{money(item.amount)}</span>
                </p>
                <Button size="sm" variant="outline" onClick={() => setPending(item)}>
                  Mark as settled
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {recorded.length > 0 && (
        <Card>
          <CardHeader title="Recorded payments" description="Undo a payment if it was recorded by mistake." />
          <ul className="space-y-3">
            {recorded.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {item.fromName} paid {item.toName} <span className="font-semibold">{money(item.amount)}</span>
                  <span className="ml-2 text-xs text-subtle">{formatDate(item.settledOn)}</span>
                </span>
                <Button size="sm" variant="ghost" onClick={() => setUndoing(item)}>
                  Undo
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="Mark as settled"
        description={`Confirm that ${pending?.fromName} paid ${money(pending?.amount || 0)} to ${pending?.toName}. Everyone in the group will see it.`}
        confirmLabel="Mark as settled"
        loading={busy}
        onConfirm={() => run(() => expenseService.settle(pending), 'Payment recorded.')}
      />
      <ConfirmDialog
        open={Boolean(undoing)}
        onClose={() => setUndoing(null)}
        title="Undo payment"
        description={`Remove the recorded payment of ${money(undoing?.amount || 0)} from ${undoing?.fromName} to ${undoing?.toName}? Balances will be recalculated.`}
        confirmLabel="Undo payment"
        loading={busy}
        onConfirm={() => run(() => expenseService.undoSettlement(undoing), 'Payment removed.')}
      />
    </div>
  )
}
