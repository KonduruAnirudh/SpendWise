import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { ExpenseComposer } from '../../features/expense-sharing/components/ExpenseComposer'
import { SelectedMembers } from '../../features/expense-sharing/components/PeoplePicker'
import { MemberForm } from '../../features/expense-sharing/components/MemberForm'
import { GroupSettlements } from '../../features/expense-sharing/components/GroupSettlements'
import { useAsync } from '../../hooks/useAsync'
import { useExpenseSplit } from '../../hooks/useExpenseSplit'
import { useToast } from '../../context/ToastContext'
import { groupService } from '../../services/groupService'
import { expenseService } from '../../services/expenseService'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { emptyMember, validateMember, validateSharedExpense } from '../../utils/validators'

const EMPTY_MEMBERS = []
const money = (amount) => formatCurrency(amount, 'INR', { fractionDigits: 2 })

export function GroupDetailsPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { push } = useToast()
  const group = useAsync(() => groupService.get(groupId), [groupId])
  const expenses = useAsync(() => expenseService.listExpenses(groupId), [groupId])
  const balances = useAsync(() => expenseService.getBalances(groupId), [groupId])
  const settlements = useAsync(() => expenseService.listSettlements(groupId), [groupId])
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingExpense, setDeletingExpense] = useState(null)
  const [saving, setSaving] = useState(false)
  const [memberForm, setMemberForm] = useState(emptyMember)
  const [memberErrors, setMemberErrors] = useState({})
  const [form, setForm] = useState({
    name: '',
    date: new Date().toISOString().slice(0, 10),
  })
  const [errors, setErrors] = useState({})

  const members = group.data?.members || EMPTY_MEMBERS
  const split = useExpenseSplit({ members })

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
    } catch (error) {
      push(error.message, 'error')
      setDeleteOpen(false)
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
    split.setTax(0)
    split.setTip(0)
    split.resetEqualAdjustments()
    setExpenseOpen(true)
  }

  async function saveExpense() {
    const payload = {
      ...form,
      groupId,
      members,
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

    setSaving(true)
    try {
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
    } catch (error) {
      // The server re-validates every split; its message names the numbers that don't add up.
      push(error.message, 'error')
      return
    } finally {
      setSaving(false)
    }
    setExpenseOpen(false)
    refreshGroup()
  }

  async function addMember() {
    const nextErrors = validateMember(memberForm)
    setMemberErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    try {
      const added = await groupService.addMember(groupId, memberForm)
      push(`${added.name} added to the group.`)
      setMemberForm(emptyMember)
      refreshGroup()
    } catch (error) {
      setMemberErrors({ [memberForm.email?.trim() ? 'email' : 'name']: error.message })
    }
  }

  async function removeMember(memberId) {
    try {
      await groupService.removeMember(groupId, memberId)
      push('Member removed.')
      refreshGroup()
    } catch (error) {
      // e.g. 403 (only the owner can remove), 400 (the owner), 409 (member has expenses).
      push(error.message, 'error')
    }
  }

  async function deleteExpense() {
    try {
      await expenseService.deleteExpense(groupId, deletingExpense.id)
      push('Expense deleted.')
      refreshGroup()
    } catch (error) {
      push(error.message, 'error')
    } finally {
      setDeletingExpense(null)
    }
  }

  if (group.loading || expenses.loading) return <SkeletonCard />
  if (group.error || !group.data) return <ErrorState message="Unable to load this group." onRetry={group.refetch} />

  // Balances are per group member (not per user); the API marks which member is "me".
  const me = (balances.data || []).find((item) => item.isMe)
  const youOwe = me && me.net < 0 ? Math.abs(me.net) : 0
  const youAreOwed = me && me.net > 0 ? me.net : 0

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
        <SelectedMembers members={members} onRemove={removeMember} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Total expenses</p>
          <p className="mt-2 text-2xl font-semibold">{money(group.data.totalExpenses)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">You owe</p>
          <p className="mt-2 text-2xl font-semibold">{money(youOwe)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">You are owed</p>
          <p className="mt-2 text-2xl font-semibold">{money(youAreOwed)}</p>
        </Card>
      </div>

      <h2 className="mb-3 text-base font-semibold">Recent expenses</h2>
      <div className="mb-8 space-y-3">
        {(expenses.data || []).length === 0 && (
          <EmptyState title="No expenses yet." actionLabel="Add expense" onAction={openExpense} />
        )}
        {(expenses.data || []).map((expense) => (
          <Card key={expense.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{expense.name}</p>
              <p className="text-xs text-muted">
                {formatDate(expense.date)} · {expense.splitMethod}
                {expense.splitMethod === 'reimbursement' && expense.paidByName && expense.receivedByName
                  ? ` · ${expense.paidByName} paid for ${expense.receivedByName}`
                  : expense.paidByName
                    ? ` · paid by ${expense.paidByName}`
                    : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {expense.splitMethod === 'reimbursement' && <Badge tone="accent">Reimbursement</Badge>}
              <p className="font-semibold">{money(expense.amount)}</p>
              <button
                type="button"
                onClick={() => setDeletingExpense(expense)}
                className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-danger"
                aria-label={`Delete ${expense.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 text-base font-semibold">Settlements</h2>
      <GroupSettlements
        groupName={group.data.name}
        balances={balances.data || []}
        settlements={settlements.data || []}
        onSettled={refreshGroup}
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
            <Button onClick={saveExpense} loading={saving}>
              Save expense
            </Button>
          </>
        }
      >
        <ExpenseComposer members={members} split={split} values={form} onValues={setForm} errors={errors} />
      </Modal>

      <Modal
        open={memberOpen}
        onClose={() => {
          setMemberOpen(false)
          setMemberErrors({})
        }}
        title="Manage members"
        className="sm:max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMemberOpen(false)}>
              Done
            </Button>
            <Button onClick={addMember}>Add member</Button>
          </>
        }
      >
        <div className="space-y-5">
          <SelectedMembers members={members} onRemove={removeMember} />
          <MemberForm values={memberForm} onChange={setMemberForm} errors={memberErrors} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingExpense)}
        onClose={() => setDeletingExpense(null)}
        title="Delete expense"
        description={`Delete ${deletingExpense?.name}? Balances and suggested payments will be recalculated.`}
        confirmLabel="Delete expense"
        onConfirm={deleteExpense}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete group"
        description={`This permanently removes ${group.data.name}, including its members, expenses, and settlements. Only the group owner can do this.`}
        confirmLabel="Delete group"
        loading={deleting}
        onConfirm={deleteGroup}
      />
    </div>
  )
}
