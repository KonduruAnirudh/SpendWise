import { expensesApi } from '../api/expensesApi'
import { withMock } from './mockStore'
import { expensesStore, groupsStore, settlementsStore, balancesStore } from './sharingStore'
import { currentUser } from '../mock/user'
import { generateId } from '../utils/formatters'
import { groupService } from './groupService'

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

export const expenseService = {
  async getSummary() {
    return withMock(
      () => summaryFromSettlements(),
      () => expensesApi.summary(),
    )
  },

  listGroups: groupService.list,
  getGroup: groupService.get,
  createGroup: groupService.create,

  async listExpenses(groupId) {
    return withMock(
      () => expensesStore.all().filter((item) => !groupId || item.groupId === groupId),
      () => expensesApi.list(groupId),
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
      () => expensesApi.create(payload),
    )
  },

  async getBalances(groupId) {
    return withMock(
      () => balancesStore.all().filter((item) => inGroup(item, groupId)),
      () => expensesApi.balances(groupId),
    )
  },

  async listSettlements(groupId) {
    return withMock(
      () => settlementsStore.all().filter((item) => inGroup(item, groupId)),
      () => expensesApi.settlements(groupId),
    )
  },

  async settle(id) {
    return withMock(
      () => {
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
      () => expensesApi.settle(id),
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
      () => expensesApi.create({ ...payload, splitMethod: 'reimbursement' }),
    )
  },
}
