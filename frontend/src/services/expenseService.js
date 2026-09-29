import { api } from './api'
import { withMock } from './mockStore'
import { expensesStore, groupsStore, settlementsStore, balancesStore } from './sharingStore'
import { currentUser } from '../mock/user'
import { generateId } from '../utils/formatters'
import { fromPaise, itemizedLines, toPaise } from '../utils/splitCalculations'
import { SHARING_SERVICE, groupService } from './groupService'

function inGroup(item, groupId) {
  return !groupId || item.groupId === groupId
}

function summaryFromSettlements() {
  const pending = settlementsStore.all().filter((item) => item.status !== 'settled')
  return {
    youOwe: pending
      .filter((item) => item.fromId === currentUser.id)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    youAreOwed: pending
      .filter((item) => item.toId === currentUser.id)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0),
  }
}

// ---------- Adapters: backend contract ↔ shapes the sharing pages use ----------
const money = (value) => fromPaise(toPaise(value)).toFixed(2)

function toUiExpense(apiExpense, groupId, groupName) {
  const splits = apiExpense.splits.map((split) => ({
    memberId: split.member_id,
    personId: split.member_id,
    name: split.display_name,
    amount: Number(split.amount),
  }))
  return {
    id: apiExpense.id,
    groupId,
    groupName,
    name: apiExpense.description,
    amount: Number(apiExpense.amount),
    date: apiExpense.occurred_on,
    splitMethod: apiExpense.split_method,
    paidBy: apiExpense.paid_by.id,
    paidByName: apiExpense.paid_by.display_name,
    // A reimbursement has a single split: the person who owes the payer.
    receivedByName: apiExpense.split_method === 'reimbursement' ? splits[0]?.name : undefined,
    splits,
  }
}

// The preview rows carry each method's input (amount, percent, shares, extra); the server
// recomputes the split from these values. Zero rows are left out: they mean "not included".
function toApiParticipants(payload) {
  const rows = payload.splits || []
  const id = (row) => Number(row.memberId)
  switch (payload.splitMethod) {
    case 'equal':
      return rows.map((row) => ({ member_id: id(row) }))
    case 'exact':
      return rows.filter((row) => toPaise(row.amount) > 0).map((row) => ({ member_id: id(row), value: money(row.amount) }))
    case 'percentage':
      return rows.filter((row) => toPaise(row.percent) > 0).map((row) => ({ member_id: id(row), value: money(row.percent) }))
    case 'shares':
      return rows.filter((row) => toPaise(row.shares) > 0).map((row) => ({ member_id: id(row), value: money(row.shares) }))
    case 'adjustment':
      return rows.map((row) => ({ member_id: id(row), value: money(row.extra) }))
    case 'reimbursement':
      return [{ member_id: Number(payload.receivedBy) }]
    default:
      return []
  }
}

function toApiExpense(payload) {
  const itemized = payload.splitMethod === 'itemized'
  return {
    description: payload.name?.trim() || (payload.splitMethod === 'reimbursement' ? 'Reimbursement' : 'Expense'),
    amount: money(payload.amount),
    paid_by_member_id: Number(payload.paidBy),
    split_method: payload.splitMethod,
    participants: itemized ? [] : toApiParticipants(payload),
    items: itemized
      ? itemizedLines(payload.members || [], payload.items, payload.tax, payload.tip).map((line) => ({
          description: line.description.slice(0, 100),
          amount: money(line.amount),
          member_ids: line.memberIds.map(Number),
        }))
      : [],
    occurred_on: payload.date || undefined,
  }
}

function toUiMemberBalance(row, myMemberId) {
  return {
    memberId: row.member_id,
    name: row.display_name,
    isGuest: row.is_guest,
    paid: Number(row.paid),
    share: Number(row.share),
    // net = paid − share + settlements sent − settlements received; positive means they get money back.
    net: Number(row.net),
    isMe: row.member_id === myMemberId,
  }
}

function toUiSettlement(groupId, row, status) {
  return {
    // Suggestions are computed live and have no id; recorded settlements do.
    id: status === 'settled' ? row.id : `suggested-${row.from_member.id}-${row.to_member.id}`,
    groupId,
    fromId: row.from_member.id,
    fromName: row.from_member.display_name,
    toId: row.to_member.id,
    toName: row.to_member.display_name,
    amount: Number(row.amount),
    amountText: row.amount,
    status,
    settledOn: row.settled_on,
    note: row.note,
  }
}

async function listGroupExpenses(groupId, groupName) {
  const rows = await api.get(`/groups/${groupId}/expenses`)
  return rows.map((row) => toUiExpense(row, groupId, groupName))
}

export const expenseService = {
  // Totals across all groups, from each group's net position for the current user.
  async getSummary() {
    return withMock(
      () => summaryFromSettlements(),
      async () => {
        const positions = await api.get('/users/me/group-balances')
        let owe = 0
        let owed = 0
        positions.forEach((position) => {
          const net = toPaise(position.my_net)
          if (net < 0) owe -= net
          else owed += net
        })
        return { youOwe: fromPaise(owe), youAreOwed: fromPaise(owed) }
      },
      SHARING_SERVICE,
    )
  },

  listGroups: groupService.list,
  getGroup: groupService.get,
  createGroup: groupService.create,

  async listExpenses(groupId) {
    return withMock(
      () => expensesStore.all().filter((item) => !groupId || item.groupId === groupId),
      async () => {
        if (groupId) return listGroupExpenses(groupId)
        const groups = await api.get('/groups')
        const perGroup = await Promise.all(groups.map((group) => listGroupExpenses(group.id, group.name)))
        return perGroup.flat().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
      },
      SHARING_SERVICE,
    )
  },

  async createExpense(payload) {
    return withMock(
      () => {
        const item = {
          id: generateId('exp'),
          date: new Date().toISOString().slice(0, 10),
          ...payload,
          amount: Number(payload.amount) || 0,
          splits: (payload.splits || []).map((split) => ({
            personId: split.personId || split.memberId,
            memberId: split.memberId || split.personId,
            amount: Number(split.amount) || 0,
            percent: split.percent,
            shares: split.shares,
          })),
        }
        expensesStore.update((rows) => [item, ...rows])
        if (item.groupId) {
          groupsStore.update((groups) =>
            groups.map((group) =>
              group.id === item.groupId
                ? {
                    ...group,
                    totalExpenses: Number(group.totalExpenses || 0) + item.amount,
                    lastActivity: item.date,
                  }
                : group,
            ),
          )
        }
        return item
      },
      // The server recomputes the split; the saved amounts in the response are the real ones.
      async () => toUiExpense(await api.post(`/groups/${payload.groupId}/expenses`, toApiExpense(payload)), payload.groupId),
      SHARING_SERVICE,
    )
  },

  async deleteExpense(groupId, expenseId) {
    return withMock(
      () => {
        expensesStore.update((rows) => rows.filter((row) => row.id !== expenseId))
        return { id: expenseId }
      },
      async () => {
        await api.delete(`/groups/${groupId}/expenses/${expenseId}`)
        return { id: expenseId }
      },
      SHARING_SERVICE,
    )
  },

  async getBalances(groupId) {
    return withMock(
      () => balancesStore.all().filter((item) => inGroup(item, groupId)),
      async () => {
        const data = await api.get(`/groups/${groupId}/balances`)
        return data.members.map((row) => toUiMemberBalance(row, data.my_member_id))
      },
      SHARING_SERVICE,
    )
  },

  // Pending = the server's suggested (simplified) payments; settled = recorded settlements.
  async listSettlements(groupId) {
    return withMock(
      () => settlementsStore.all().filter((item) => inGroup(item, groupId)),
      async () => {
        const [suggested, recorded] = await Promise.all([
          api.get(`/groups/${groupId}/settlements/suggested`),
          api.get(`/groups/${groupId}/settlements`),
        ])
        return [
          ...suggested.map((row) => toUiSettlement(groupId, row, 'pending')),
          ...recorded.map((row) => toUiSettlement(groupId, row, 'settled')),
        ]
      },
      SHARING_SERVICE,
    )
  },

  // Records a payment as a fact. Live: `settlement` is the suggested row; mock: its id.
  async settle(settlement) {
    return withMock(
      () => {
        const id = settlement?.id ?? settlement
        let next = null
        settlementsStore.update((rows) =>
          rows.map((row) => {
            if (row.id !== id) return row
            next = { ...row, status: 'settled' }
            return next
          }),
        )
        if (next) {
          balancesStore.update((rows) =>
            rows.filter(
              (row) =>
                !(
                  row.groupId === next.groupId &&
                  row.fromId === next.fromId &&
                  row.toId === next.toId &&
                  Number(row.amount) === Number(next.amount)
                ),
            ),
          )
        }
        return next
      },
      async () =>
        toUiSettlement(
          settlement.groupId,
          await api.post(`/groups/${settlement.groupId}/settlements`, {
            from_member_id: settlement.fromId,
            to_member_id: settlement.toId,
            amount: settlement.amountText ?? money(settlement.amount),
          }),
          'settled',
        ),
      SHARING_SERVICE,
    )
  },

  // Deleting a recorded settlement is the undo; balances and suggestions recompute on the server.
  async undoSettlement(settlement) {
    return withMock(
      () => {
        settlementsStore.update((rows) =>
          rows.map((row) => (row.id === settlement.id ? { ...row, status: 'pending' } : row)),
        )
        return { id: settlement.id }
      },
      async () => {
        await api.delete(`/groups/${settlement.groupId}/settlements/${settlement.id}`)
        return { id: settlement.id }
      },
      SHARING_SERVICE,
    )
  },

  async createReimbursement(payload) {
    return withMock(
      () => {
        const item = {
          id: generateId('exp'),
          name: payload.name || 'Reimbursement',
          splitMethod: 'reimbursement',
          date: payload.date || new Date().toISOString().slice(0, 10),
          ...payload,
        }
        expensesStore.update((rows) => [item, ...rows])
        const settlement = {
          id: generateId('set'),
          groupId: payload.groupId,
          fromId: payload.paidBy,
          fromName: payload.paidByName,
          toId: payload.receivedBy,
          toName: payload.receivedByName,
          amount: Number(payload.amount) || 0,
          status: 'pending',
          type: 'reimbursement',
        }
        settlementsStore.update((rows) => [settlement, ...rows])
        balancesStore.update((rows) => [
          {
            groupId: payload.groupId,
            fromId: payload.paidBy,
            fromName: payload.paidByName,
            toId: payload.receivedBy,
            toName: payload.receivedByName,
            amount: Number(payload.amount) || 0,
          },
          ...rows,
        ])
        return { expense: item, settlement }
      },
      // A reimbursement is an ordinary expense with split_method "reimbursement".
      () => expenseService.createExpense({ ...payload, splitMethod: 'reimbursement' }),
      SHARING_SERVICE,
    )
  },
}
