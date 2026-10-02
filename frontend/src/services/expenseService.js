import { api } from './api'
import { fromPaise, itemizedLines, toPaise } from '../utils/splitCalculations'
import { groupService } from './groupService'

// ---------- Adapters: backend contract ↔ shapes the sharing pages use ----------
const money = (value) => fromPaise(toPaise(value)).toFixed(2)

function toUiExpense(apiExpense, groupId, groupName, currency) {
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
    currency,
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

async function listGroupExpenses(groupId, groupName, currency) {
  const rows = await api.get(`/groups/${groupId}/expenses`)
  return rows.map((row) => toUiExpense(row, groupId, groupName, currency))
}

export const expenseService = {
  // What you owe and are owed across all groups, kept apart per currency: a USD trip and an
  // INR flat share can't be added together. Each total is summed in integer minor units.
  async getSummary() {
    const positions = await api.get('/users/me/group-balances')
    const byCurrency = new Map()
    positions.forEach((position) => {
      const total = byCurrency.get(position.currency) || { owe: 0, owed: 0 }
      const net = toPaise(position.my_net)
      if (net < 0) total.owe -= net
      else total.owed += net
      byCurrency.set(position.currency, total)
    })
    return {
      totals: [...byCurrency.entries()].map(([currency, total]) => ({
        currency,
        youOwe: fromPaise(total.owe),
        youAreOwed: fromPaise(total.owed),
      })),
    }
  },

  listGroups: groupService.list,
  getGroup: groupService.get,
  createGroup: groupService.create,

  async listExpenses(groupId) {
    if (groupId) return listGroupExpenses(groupId)
    const groups = await api.get('/groups')
    const perGroup = await Promise.all(groups.map((group) => listGroupExpenses(group.id, group.name, group.currency)))
    return perGroup.flat().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  },

  // The server recomputes the split; the saved amounts in the response are the real ones.
  async createExpense(payload) {
    return toUiExpense(await api.post(`/groups/${payload.groupId}/expenses`, toApiExpense(payload)), payload.groupId)
  },

  // A reimbursement is an ordinary expense with split_method "reimbursement".
  async createReimbursement(payload) {
    return expenseService.createExpense({ ...payload, splitMethod: 'reimbursement' })
  },

  async deleteExpense(groupId, expenseId) {
    await api.delete(`/groups/${groupId}/expenses/${expenseId}`)
    return { id: expenseId }
  },

  async getBalances(groupId) {
    const data = await api.get(`/groups/${groupId}/balances`)
    return data.members.map((row) => toUiMemberBalance(row, data.my_member_id))
  },

  // Pending = the server's suggested (simplified) payments; settled = recorded settlements.
  async listSettlements(groupId) {
    const [suggested, recorded] = await Promise.all([
      api.get(`/groups/${groupId}/settlements/suggested`),
      api.get(`/groups/${groupId}/settlements`),
    ])
    return [
      ...suggested.map((row) => toUiSettlement(groupId, row, 'pending')),
      ...recorded.map((row) => toUiSettlement(groupId, row, 'settled')),
    ]
  },

  // Records a suggested payment as a fact.
  async settle(settlement) {
    const recorded = await api.post(`/groups/${settlement.groupId}/settlements`, {
      from_member_id: settlement.fromId,
      to_member_id: settlement.toId,
      amount: settlement.amountText ?? money(settlement.amount),
    })
    return toUiSettlement(settlement.groupId, recorded, 'settled')
  },

  // Deleting a recorded settlement is the undo; balances and suggestions recompute on the server.
  async undoSettlement(settlement) {
    await api.delete(`/groups/${settlement.groupId}/settlements/${settlement.id}`)
    return { id: settlement.id }
  },
}
