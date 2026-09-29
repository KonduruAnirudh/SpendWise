import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { TransactionForm } from '../../components/forms/TransactionForm'
import { TransactionTable } from '../../components/transactions/TransactionTable'
import { TransactionFilters } from '../../components/transactions/TransactionFilters'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { transactionService } from '../../services/transactionService'
import { categoryService } from '../../services/categoryService'
import { accountService } from '../../services/accountService'
import { validateTransaction } from '../../utils/validators'
import { PAGE_SIZE } from '../../utils/constants'

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  type: 'expense',
  amount: '',
  description: '',
  categoryId: '',
  subcategoryId: '',
  accountId: '',
  paymentMode: 'UPI',
  notes: '',
  tags: '',
}

export function TransactionsPage() {
  const { push } = useToast()
  const { user } = useAuth()
  const [filters, setFilters] = useState({ search: '', categoryId: '', accountId: '', type: '', from: '', sort: 'date' })
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [deleting, setDeleting] = useState(null)

  const categories = useAsync(() => categoryService.list(), [])
  const accounts = useAsync(() => accountService.list(), [])
  const list = useAsync(() => transactionService.list(filters), [filters])

  const lookup = {
    category: (id) => categories.data?.find((item) => item.id === id)?.name || '—',
    account: (id) => accounts.data?.find((item) => item.id === id)?.name || '—',
  }

  const paged = useMemo(() => {
    const rows = list.data || []
    const start = (page - 1) * PAGE_SIZE
    return {
      rows: rows.slice(start, start + PAGE_SIZE),
      pages: Math.max(1, Math.ceil(rows.length / PAGE_SIZE)),
      total: rows.length,
    }
  }, [list.data, page])

  function openCreate() {
    setForm({ ...emptyForm, accountId: user?.defaultAccountId || '', categoryId: user?.defaultCategoryId || '' })
    setEditing('new')
    setErrors({})
  }

  function openEdit(row) {
    setForm({ ...row, tags: (row.tags || []).join(', ') })
    setEditing(row)
    setErrors({})
  }

  async function save() {
    const payload = {
      ...form,
      amount: Number(form.amount),
      tags: String(form.tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    }
    const nextErrors = validateTransaction(payload)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    if (editing === 'new') {
      await transactionService.create(payload)
      push('Transaction added successfully.')
    } else {
      await transactionService.update(editing.id, payload)
      push('Transaction updated.')
    }
    setEditing(null)
    list.refetch()
  }

  async function confirmDelete() {
    await transactionService.remove(deleting.id)
    push('Transaction deleted.')
    setDeleting(null)
    list.refetch()
  }

  if (list.loading || categories.loading || accounts.loading) return <SkeletonCard rows={6} />
  if (list.error) return <ErrorState message="Unable to load your transactions." onRetry={list.refetch} />

  return (
    <div>
      <PageHeader
        eyebrow="Money"
        title="Transactions"
        description="Search, filter, and keep every rupee accounted for."
        actions={<Button onClick={openCreate}>Add transaction</Button>}
      />
      <TransactionFilters
        filters={filters}
        onChange={(next) => {
          setFilters(next)
          setPage(1)
        }}
        categories={categories.data}
        accounts={accounts.data}
      />
      <div className="mt-5">
        {paged.total === 0 ? (
          <EmptyState title="No transactions yet." description="Add your first transaction to start tracking." actionLabel="Add your first transaction →" onAction={openCreate} />
        ) : (
          <>
            <TransactionTable
              rows={paged.rows}
              lookup={lookup}
              onEdit={openEdit}
              onDelete={setDeleting}
              dateFormat={user?.dateFormat}
            />
            <div className="mt-4 flex items-center justify-between text-sm text-muted">
              <p>
                {paged.total} transactions · page {page} of {paged.pages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page === paged.pages} onClick={() => setPage((value) => value + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add transaction' : 'Edit transaction'}
        className="sm:max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <TransactionForm
          values={form}
          onChange={setForm}
          errors={errors}
          categories={categories.data || []}
          accounts={accounts.data || []}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete transaction"
        description="This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  )
}
