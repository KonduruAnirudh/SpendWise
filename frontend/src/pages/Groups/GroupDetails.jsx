import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ErrorState } from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { ExpenseComposer } from '../../features/expense-sharing/components/ExpenseComposer'
import { PeoplePicker, SelectedMembers } from '../../features/expense-sharing/components/PeoplePicker'
import { PersonForm } from '../../features/expense-sharing/components/PersonForm'
import { BillUploadFlow } from '../../features/expense-sharing/components/BillUploadFlow'
import { GroupSettlements } from '../../features/expense-sharing/components/GroupSettlements'
import { useAsync } from '../../hooks/useAsync'
import { useExpenseSplit } from '../../hooks/useExpenseSplit'
import { useBillUpload } from '../../hooks/useBillUpload'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { groupService } from '../../services/groupService'
import { expenseService } from '../../services/expenseService'
import { peopleService } from '../../services/peopleService'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { validatePerson, validateSharedExpense } from '../../utils/validators'

const EMPTY_MEMBERS = []

export function GroupDetailsPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { push } = useToast()
  const { user } = useAuth()
  const group = useAsync(() => groupService.get(groupId), [groupId])
  const expenses = useAsync(() => expenseService.listExpenses(groupId), [groupId])
  const balances = useAsync(() => expenseService.getBalances(groupId), [groupId])
  const settlements = useAsync(() => expenseService.listSettlements(groupId), [groupId])
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [billOpen, setBillOpen] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [creatingPerson, setCreatingPerson] = useState(false)
  const [personForm, setPersonForm] = useState({ name: '', email: '', phone: '' })
  const [personErrors, setPersonErrors] = useState({})
  const [form, setForm] = useState({
    name: '',
    date: new Date().toISOString().slice(0, 10),
  })
  const [errors, setErrors] = useState({})

  const members = group.data?.members || EMPTY_MEMBERS
  const split = useExpenseSplit({ members })
  const billFlow = useBillUpload()

  const peopleById = useMemo(
    () => Object.fromEntries(members.map((member) => [member.id, member])),
    [members],
  )

  async function refreshGroup() {
    await Promise.all([group.refetch(), expenses.refetch(), balances.refetch(), settlements.refetch()])
  }

  async function deleteGroup() {
    setDeleting(true)
    try {
      await groupService.remove(groupId)
      push('Group deleted.')
      navigate('/groups', { replace: true })
    } finally {
      setDeleting(false)
    }
  }

  function openExpense() {
    setForm({ name: '', date: new Date().toISOString().slice(0, 10) })
    setErrors({})
    split.setMethod('equal')
    split.setAmount('')
    split.setPaidBy('')
    split.setReceivedBy('')
    split.setItems([])
    setExpenseOpen(true)
  }

  async function saveExpense() {
    const payload = {
      ...form,
      groupId,
      paidBy: split.paidBy,
      receivedBy: split.receivedBy,
      splitMethod: split.method,
      amount: split.total,
      splits: split.splits,
      items: split.method === 'itemized' ? split.items : undefined,
      tax: split.tax,
      tip: split.tip,
    }
    const nextErrors = { ...validateSharedExpense(payload, split.splits), ...split.errors }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    if (split.method === 'reimbursement') {
      await expenseService.createReimbursement({
        ...payload,
        name: form.name || 'Reimbursement',
        paidByName: peopleById[split.paidBy]?.name,
        receivedByName: peopleById[split.receivedBy]?.name,
      })
      push('Reimbursement created.')
    } else {
      await expenseService.createExpense(payload)
      push('Expense created.')
    }
    setExpenseOpen(false)
    billFlow.reset()
    setBillOpen(false)
    refreshGroup()
  }

  async function addExisting(person) {
    await groupService.addMember(groupId, person.id)
    refreshGroup()
  }

  async function saveNewPerson() {
    const nextErrors = validatePerson(personForm)
    setPersonErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const created = await peopleService.create(personForm)
    await groupService.addMember(groupId, created.id)
    setCreatingPerson(false)
    setPersonForm({ name: '', email: '', phone: '' })
    push('Person added to group.')
    refreshGroup()
  }

  if (group.loading || expenses.loading) return <SkeletonCard />
  if (group.error || !group.data) return <ErrorState message="Unable to load this group." onRetry={group.refetch} />

  const youOwe = (balances.data || [])
    .filter((item) => item.fromId === user?.id)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const youAreOwed = (balances.data || [])
    .filter((item) => item.toId === user?.id)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  return (
    <div>
      <p className="mb-4 text-sm">
        <Link to="/groups" className="text-muted hover:text-fg">
          ← Groups
        </Link>
      </p>
      <PageHeader
        title={group.data.name}
        description={`${members.length} members`}
        actions={
          <>
            <Button variant="outline" onClick={() => setBillOpen(true)}>
              Upload bill
            </Button>
            <Button variant="outline" onClick={() => setMemberOpen(true)}>
              Manage members
            </Button>
            <Button onClick={openExpense}>Add expense</Button>
            <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
              Delete group
            </Button>
          </>
        }
      />

      <div className="mb-6">
        <SelectedMembers
          members={members}
          onRemove={async (id) => {
            await groupService.removeMember(groupId, id)
            refreshGroup()
          }}
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Total expenses</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(group.data.totalExpenses)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">You owe</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(youOwe)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">You are owed</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(youAreOwed)}</p>
        </Card>
      </div>

      <h2 className="mb-3 text-base font-semibold">Recent expenses</h2>
      <div className="mb-8 space-y-3">
        {(expenses.data || []).map((expense) => (
          <Card key={expense.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{expense.name}</p>
              <p className="text-xs text-muted">
                {formatDate(expense.date)} · {expense.splitMethod}
                {expense.splitMethod === 'reimbursement' && expense.paidByName && expense.receivedByName
                  ? ` · ${expense.paidByName} → ${expense.receivedByName}`
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {expense.splitMethod === 'reimbursement' && <Badge tone="accent">Reimbursement</Badge>}
              <p className="font-semibold">{formatCurrency(expense.amount)}</p>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 text-base font-semibold">Settlements</h2>
      <GroupSettlements
        groupName={group.data.name}
        balances={balances.data || []}
        settlements={settlements.data || []}
        onSettled={() => {
          push('Settlement marked as completed.')
          refreshGroup()
        }}
      />

      <Modal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        title="Add shared expense"
        className="sm:max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setExpenseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveExpense}>Save expense</Button>
          </>
        }
      >
        <ExpenseComposer members={members} split={split} values={form} onValues={setForm} errors={errors} />
      </Modal>

      <Modal
        open={billOpen}
        onClose={() => {
          billFlow.reset()
          setBillOpen(false)
        }}
        title="Upload bill"
        className="sm:max-w-2xl"
        footer={
          billFlow.status === 'split' ? (
            <>
              <Button variant="ghost" onClick={() => billFlow.reset()}>
                Back
              </Button>
              <Button onClick={saveExpense}>Confirm split</Button>
            </>
          ) : null
        }
      >
        {billFlow.status !== 'split' && (
          <BillUploadFlow
            flow={billFlow}
            onContinue={() => {
              const bill = billFlow.confirmReview()
              split.applyBill(bill)
              split.setMethod('itemized')
              setForm((current) => ({ ...current, name: bill.merchant || current.name || 'Bill' }))
            }}
          />
        )}
        {billFlow.status === 'split' && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              How would you like to split this bill of {formatCurrency(billFlow.bill?.total || 0)}?
            </p>
            <ExpenseComposer members={members} split={split} values={form} onValues={setForm} errors={errors} />
          </div>
        )}
      </Modal>

      <Modal
        open={memberOpen}
        onClose={() => setMemberOpen(false)}
        title="Manage members"
        className="sm:max-w-lg"
      >
        <div className="space-y-4">
          <SelectedMembers
            members={members}
            onRemove={async (id) => {
              await groupService.removeMember(groupId, id)
              refreshGroup()
            }}
          />
          {creatingPerson ? (
            <div>
              <PersonForm values={personForm} onChange={setPersonForm} errors={personErrors} />
              <div className="mt-3 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setCreatingPerson(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveNewPerson}>
                  Add person
                </Button>
              </div>
            </div>
          ) : (
            <PeoplePicker
              selectedIds={members.map((member) => member.id)}
              onToggle={async (person) => {
                if (members.some((member) => member.id === person.id)) {
                  await groupService.removeMember(groupId, person.id)
                } else {
                  await addExisting(person)
                }
              }}
              onCreate={() => setCreatingPerson(true)}
            />
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete group"
        description={`This permanently removes ${group.data.name}, including members, expenses, bills, and settlements. People in your contacts are not deleted.`}
        confirmLabel="Delete group"
        loading={deleting}
        onConfirm={deleteGroup}
      />
    </div>
  )
}
