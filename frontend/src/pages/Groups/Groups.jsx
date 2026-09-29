import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { GroupCard } from '../../components/expenses/GroupCard'
import { CreateGroupModal } from '../../features/expense-sharing/components/CreateGroupModal'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import { groupService } from '../../services/groupService'

export function GroupsPage() {
  const { push } = useToast()
  const groups = useAsync(() => groupService.list(), [])
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(params.get('create') === '1')

  useEffect(() => {
    if (params.get('create') === '1') setOpen(true)
  }, [params])

  if (groups.loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }
  if (groups.error) return <ErrorState message="Unable to load groups." onRetry={groups.refetch} />

  return (
    <div>
      <PageHeader
        eyebrow="Expense sharing"
        title="Groups"
        description="Split trips, rent, and dinners without the spreadsheet."
        actions={<Button onClick={() => setOpen(true)}>+ Create group</Button>}
      />
      {groups.data.length === 0 ? (
        <EmptyState title="No groups yet." actionLabel="Create group" onAction={() => setOpen(true)} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.data.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
      <CreateGroupModal
        open={open}
        onClose={() => {
          setOpen(false)
          if (params.get('create')) {
            params.delete('create')
            setParams(params)
          }
        }}
        onCreated={() => {
          push('Group created.')
          groups.refetch()
        }}
      />
    </div>
  )
}
