import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Select } from '../../components/ui/Select'
import { ErrorState } from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { GroupSettlements } from '../../features/expense-sharing/components/GroupSettlements'
import { useAsync } from '../../hooks/useAsync'
import { expenseService } from '../../services/expenseService'
import { groupService } from '../../services/groupService'

export function SettlementsPage() {
  const groups = useAsync(() => groupService.list(), [])
  const [groupId, setGroupId] = useState('')
  const selectedId = groupId || groups.data?.[0]?.id || ''
  const balances = useAsync(() => (selectedId ? expenseService.getBalances(selectedId) : Promise.resolve([])), [selectedId])
  const settlements = useAsync(
    () => (selectedId ? expenseService.listSettlements(selectedId) : Promise.resolve([])),
    [selectedId],
  )

  if (groups.loading) return <SkeletonCard />
  if (groups.error) return <ErrorState message="Unable to load groups." onRetry={groups.refetch} />

  const selectedGroup = (groups.data || []).find((group) => group.id === selectedId)

  return (
    <div>
      <PageHeader
        eyebrow="Expense sharing"
        title="Balances & settlements"
        description="Settlements belong to a group. Everyone in the group sees the same list."
      />

      {(groups.data || []).length === 0 ? (
        <p className="text-sm text-muted">
          No groups yet.{' '}
          <Link to="/groups" className="text-accent hover:underline">
            Create a group
          </Link>{' '}
          to start settling.
        </p>
      ) : (
        <>
          <div className="mb-6 max-w-sm">
            <Select label="Group" value={selectedId} onChange={(event) => setGroupId(event.target.value)}>
              {(groups.data || []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </div>
          {balances.loading || settlements.loading ? (
            <SkeletonCard />
          ) : (
            <GroupSettlements
              groupName={selectedGroup?.name}
              balances={balances.data || []}
              settlements={settlements.data || []}
              onSettled={() => {
                settlements.refetch()
                balances.refetch()
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
