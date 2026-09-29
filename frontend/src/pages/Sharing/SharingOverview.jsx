import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { CreateGroupModal } from '../../features/expense-sharing/components/CreateGroupModal'
import { useAsync } from '../../hooks/useAsync'
import { expenseService } from '../../services/expenseService'
import { groupService } from '../../services/groupService'
import { formatCurrency } from '../../utils/formatters'

export function SharingOverviewPage() {
  const summary = useAsync(() => expenseService.getSummary(), [])
  const groups = useAsync(() => groupService.list(), [])
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div>
      <PageHeader
        eyebrow="Expense sharing"
        title="Overview"
        description="Split trips, dinners, and bills without turning SpendWise into a spreadsheet."
        actions={<Button onClick={() => setCreateOpen(true)}>+ Create group</Button>}
      />

      <Card className="mb-6 border-accent/30 bg-accent-muted/40">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Expense sharing</p>
        <div className="mt-4 flex flex-wrap gap-8">
          <div>
            <p className="text-xs text-muted">You owe</p>
            <p className="text-2xl font-semibold">{formatCurrency(summary.data?.youOwe || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">You are owed</p>
            <p className="text-2xl font-semibold">{formatCurrency(summary.data?.youAreOwed || 0)}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/groups" className="text-sm font-medium text-accent hover:underline">
            View groups →
          </Link>
        </div>
      </Card>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <ActionLink to="/groups" title="+ Create group" detail="Start empty, then add people." />
        <ActionLink to="/groups" title="+ Add expense" detail="Open a group to split a cost." />
        <Card className="h-full">
          <p className="flex items-center gap-2 font-medium">
            Upload bill <Badge tone="accent">Coming soon</Badge>
          </p>
          <p className="mt-1 text-sm text-muted">Scan a receipt into an itemized split. Use Itemized for now.</p>
        </Card>
      </div>

      <h2 className="mb-3 text-base font-semibold">Recent groups</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {(groups.data || []).slice(0, 4).map((group) => (
          <Link key={group.id} to={`/groups/${group.id}`}>
            <Card className="transition-colors hover:border-accent/40">
              <p className="font-medium">{group.name}</p>
              <p className="mt-1 text-sm text-muted">{group.members?.length || 0} members · {formatCurrency(group.totalExpenses || 0)}</p>
            </Card>
          </Link>
        ))}
      </div>

      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => groups.refetch()}
      />
    </div>
  )
}

function ActionLink({ to, title, detail }) {
  return (
    <Link to={to}>
      <Card className="h-full transition-colors hover:border-accent/40">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted">{detail}</p>
      </Card>
    </Link>
  )
}
