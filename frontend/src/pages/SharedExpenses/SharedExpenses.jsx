import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ErrorState } from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { useAsync } from '../../hooks/useAsync'
import { expenseService } from '../../services/expenseService'
import { groupService } from '../../services/groupService'
import { peopleService } from '../../services/peopleService'
import { formatCurrency, formatDate } from '../../utils/formatters'

export function SharedExpensesPage() {
  const expenses = useAsync(() => expenseService.listExpenses(), [])
  const groups = useAsync(() => groupService.list(), [])
  const people = useAsync(() => peopleService.list(), [])

  if (expenses.loading) return <SkeletonCard rows={5} />
  if (expenses.error) return <ErrorState message="Unable to load shared expenses." onRetry={expenses.refetch} />

  const groupName = (id) => groups.data?.find((group) => group.id === id)?.name || 'Group'
  const memberName = (id) => people.data?.find((person) => person.id === id)?.name || 'Someone'

  return (
    <div>
      <PageHeader
        eyebrow="Expense sharing"
        title="Shared expenses"
        description="Every split across your groups, in one list."
      />
      <div className="space-y-3">
        {(expenses.data || []).map((expense) => (
          <Card key={expense.id} className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="font-medium">{expense.name}</p>
              <p className="text-sm text-muted">
                {groupName(expense.groupId)} · paid by {memberName(expense.paidBy)} · {formatDate(expense.date)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {expense.splitMethod === 'reimbursement' && <Badge tone="accent">Reimbursement</Badge>}
              <p className="font-semibold">{formatCurrency(expense.amount)}</p>
              <Link to={`/groups/${expense.groupId}`} className="text-sm text-accent hover:underline">
                Open group
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
