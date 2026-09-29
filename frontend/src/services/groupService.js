import { api } from './api'
import { withMock } from './mockStore'
import { groupsStore, peopleStore, expensesStore, settlementsStore, balancesStore } from './sharingStore'
import { generateId } from '../utils/formatters'
import { fromPaise, toPaise } from '../utils/splitCalculations'

export const SHARING_SERVICE = 'sharing'

function personSnapshot(id) {
  const person = peopleStore.all().find((item) => item.id === id)
  return person ? { id: person.id, name: person.name, email: person.email, phone: person.phone } : { id, name: 'Unknown' }
}

// ---------- Adapters: backend contract → shapes the sharing pages already use ----------
// Members are group_members rows (registered users or guests), never users.id.
export function toUiMember(apiMember) {
  return {
    id: apiMember.id,
    name: apiMember.display_name,
    role: apiMember.role,
    isGuest: apiMember.is_guest,
  }
}

function toUiGroup(detail, expenses = [], myNet = null) {
  const created = detail.created_at.slice(0, 10)
  return {
    id: detail.id,
    name: detail.name,
    currency: detail.currency,
    myMemberId: detail.my_member_id,
    members: detail.members.map(toUiMember),
    // Display-only totals, summed in integer paise.
    totalExpenses: fromPaise(expenses.reduce((sum, expense) => sum + toPaise(expense.amount), 0)),
    yourBalance: myNet,
    lastActivity: expenses.reduce((latest, expense) => (expense.occurred_on > latest ? expense.occurred_on : latest), created),
  }
}

// Registered users are added by email; anyone else becomes a guest with just a name.
function toApiMember(person) {
  const email = person.email?.trim()
  const name = person.name?.trim()
  if (email) return name ? { email, display_name: name } : { email }
  return { display_name: name }
}

async function loadGroup(groupId, myNet = null) {
  const [detail, expenses] = await Promise.all([
    api.get(`/groups/${groupId}`),
    api.get(`/groups/${groupId}/expenses`),
  ])
  return toUiGroup(detail, expenses, myNet)
}

export const groupService = {
  // The API's group summary has no members or totals, so each card loads its group (N+1 requests).
  // Fine for a handful of groups; production would return these stats from GET /groups.
  async list() {
    return withMock(
      () => groupsStore.all(),
      async () => {
        const [summaries, positions] = await Promise.all([api.get('/groups'), api.get('/users/me/group-balances')])
        const netByGroup = Object.fromEntries(positions.map((position) => [position.group_id, Number(position.my_net)]))
        return Promise.all(summaries.map((summary) => loadGroup(summary.id, netByGroup[summary.id] ?? 0)))
      },
      SHARING_SERVICE,
    )
  },

  async get(id) {
    return withMock(
      () => groupsStore.all().find((group) => group.id === id) || null,
      () => loadGroup(id),
      SHARING_SERVICE,
    )
  },

  // Creates the group, then adds members one by one. Members that fail (e.g. an email with no
  // SpendWise account) are reported back instead of failing the whole group.
  async create(payload) {
    return withMock(
      () => {
        const members = (payload.memberIds || payload.members || []).map((item) =>
          typeof item === 'string' ? personSnapshot(item) : item,
        )
        const item = {
          id: generateId('grp'),
          name: payload.name,
          members,
          totalExpenses: 0,
          yourBalance: 0,
          youOwe: 0,
          youAreOwed: 0,
          lastActivity: new Date().toISOString().slice(0, 10),
        }
        groupsStore.update((rows) => [item, ...rows])
        return item
      },
      async () => {
        const detail = await api.post('/groups', { name: payload.name })
        const failed = []
        for (const person of payload.members || []) {
          try {
            await api.post(`/groups/${detail.id}/members`, toApiMember(person))
          } catch (error) {
            failed.push({ name: person.name || person.email, message: error.message })
          }
        }
        return { ...(await loadGroup(detail.id, 0)), failedMembers: failed }
      },
      SHARING_SERVICE,
    )
  },

  async getMembers(groupId) {
    return withMock(
      () => groupsStore.all().find((group) => group.id === groupId)?.members || [],
      async () => (await api.get(`/groups/${groupId}/members`)).map(toUiMember),
      SHARING_SERVICE,
    )
  },

  // Live: `person` is {name, email}. Mock: a people-directory id.
  async addMember(groupId, person) {
    return withMock(
      () => {
        const personId = person
        const member = personSnapshot(personId)
        let next = null
        groupsStore.update((rows) =>
          rows.map((group) => {
            if (group.id !== groupId) return group
            if (group.members.some((item) => item.id === personId)) {
              next = group
              return group
            }
            next = { ...group, members: [...group.members, member] }
            return next
          }),
        )
        return next
      },
      async () => toUiMember(await api.post(`/groups/${groupId}/members`, toApiMember(person))),
      SHARING_SERVICE,
    )
  },

  async removeMember(groupId, memberId) {
    return withMock(
      () => {
        let next = null
        groupsStore.update((rows) =>
          rows.map((group) => {
            if (group.id !== groupId) return group
            next = { ...group, members: group.members.filter((member) => member.id !== memberId) }
            return next
          }),
        )
        return next
      },
      async () => {
        await api.delete(`/groups/${groupId}/members/${memberId}`)
        return { id: memberId }
      },
      SHARING_SERVICE,
    )
  },

  async remove(id) {
    return withMock(
      () => {
        groupsStore.update((rows) => rows.filter((group) => group.id !== id))
        expensesStore.update((rows) => rows.filter((item) => item.groupId !== id))
        settlementsStore.update((rows) => rows.filter((item) => item.groupId !== id))
        balancesStore.update((rows) => rows.filter((item) => item.groupId !== id))
        return { id }
      },
      async () => {
        await api.delete(`/groups/${id}`)
        return { id }
      },
      SHARING_SERVICE,
    )
  },
}
