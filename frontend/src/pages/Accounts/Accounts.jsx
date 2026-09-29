import { useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { AccountCard } from '../../components/accounts/AccountCard'
import { AccountForm } from '../../components/forms/AccountForm'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import { accountService } from '../../services/accountService'
import { transactionService } from '../../services/transactionService'
import { validateAccount } from '../../utils/validators'

const emptyForm = { name: '', type: 'bank', balance: '', institution: '' }

export function AccountsPage() {
  const { push } = useToast()
  const accounts = useAsync(() => accountService.list(), [])
  const transactions = useAsync(() => transactionService.list(), [])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [deleting, setDeleting] = useState(null)

  function openCreate() {
    setForm(emptyForm)
    setEditing('new')
    setErrors({})
  }

  async function save() {
    const payload = { ...form, balance: Number(form.balance) }
    const nextErrors = validateAccount(payload)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    try {
      if (editing === 'new') {
        await accountService.create(payload)
        push('Account added.')
      } else {
        await accountService.update(editing.id, payload)
        push('Account updated.')
      }
    } catch (error) {
      // Keep the modal open so the values can be corrected.
      push(error.message, 'error')
      return
    }
    setEditing(null)
    accounts.refetch()
  }

  if (accounts.loading || transactions.loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }
  if (accounts.error) return <ErrorState message="Unable to load accounts." onRetry={accounts.refetch} />

  return (
    <div>
      <PageHeader
        eyebrow="Money"
        title="Accounts"
        description="Bank, cards, cash, and UPI in one place."
        actions={<Button onClick={openCreate}>+ Add account</Button>}
      />
      {accounts.data.length === 0 ? (
        <EmptyState title="No accounts yet." actionLabel="Add account" onAction={openCreate} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.data.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              recent={(transactions.data || []).filter((txn) => txn.accountId === account.id)}
              onEdit={() => {
                setForm(account)
                setEditing(account)
              }}
              onDelete={() => setDeleting(account)}
            />
          ))}
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add account' : 'Edit account'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <AccountForm values={form} onChange={setForm} errors={errors} />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete account"
        description={`Remove ${deleting?.name}? An account that still has transactions can't be deleted.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await accountService.remove(deleting.id)
            push('Account deleted.')
          } catch (error) {
            push(error.message, 'error')
          }
          setDeleting(null)
          accounts.refetch()
        }}
      />
    </div>
  )
}
