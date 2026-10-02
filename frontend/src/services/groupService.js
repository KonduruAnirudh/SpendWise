import { api } from './api'
import { fromPaise, toPaise } from '../utils/splitCalculations'
import { normalizeUsername } from '../utils/validators'

// ---------- Adapters: backend contract → shapes the sharing pages already use ----------
// Members are group_members rows (registered users or guests), never users.id.
export function toUiMember(apiMember) {
  return {
    id: apiMember.id,
    name: apiMember.display_name,
    username: apiMember.username,
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
    simplifyDebts: detail.simplify_debts,
    myMemberId: detail.my_member_id,
    isOwner: detail.my_role === 'owner',
    members: detail.members.map(toUiMember),
    // Display-only totals, summed in integer paise.
    totalExpenses: fromPaise(expenses.reduce((sum, expense) => sum + toPaise(expense.amount), 0)),
    yourBalance: myNet,
    lastActivity: expenses.reduce((latest, expense) => (expense.occurred_on > latest ? expense.occurred_on : latest), created),
  }
}

// SpendWise users are added by username (the group then shows up for them too);
// anyone else becomes a guest with just a name.
function toApiMember(person) {
  if (person.kind === 'guest') return { display_name: person.name.trim() }
  return { username: normalizeUsername(person.username) }
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
    const [summaries, positions] = await Promise.all([api.get('/groups'), api.get('/users/me/group-balances')])
    const netByGroup = Object.fromEntries(positions.map((position) => [position.group_id, Number(position.my_net)]))
    return Promise.all(summaries.map((summary) => loadGroup(summary.id, netByGroup[summary.id] ?? 0)))
  },

  async get(id) {
    return loadGroup(id)
  },

  // Creates the group, then adds members one by one. Members that fail (e.g. an email with no
  // SpendWise account) are reported back instead of failing the whole group.
  async create(payload) {
    const detail = await api.post('/groups', { name: payload.name, currency: payload.currency })
    const failed = []
    for (const person of payload.members || []) {
      try {
        await api.post(`/groups/${detail.id}/members`, toApiMember(person))
      } catch (error) {
        failed.push({ name: person.kind === 'guest' ? person.name : `@${normalizeUsername(person.username)}`, message: error.message })
      }
    }
    return { ...(await loadGroup(detail.id, 0)), failedMembers: failed }
  },

  // Owner only (403 otherwise).
  // A currency change converts every expense, split and settlement in the group at today's rate.
  async update(id, { name, simplifyDebts, currency }) {
    return api.patch(`/groups/${id}`, { name, simplify_debts: simplifyDebts, currency })
  },

  async getMembers(groupId) {
    return (await api.get(`/groups/${groupId}/members`)).map(toUiMember)
  },

  // `person` is {kind: 'user', username} or {kind: 'guest', name}.
  async addMember(groupId, person) {
    return toUiMember(await api.post(`/groups/${groupId}/members`, toApiMember(person)))
  },

  async removeMember(groupId, memberId) {
    await api.delete(`/groups/${groupId}/members/${memberId}`)
    return { id: memberId }
  },

  async remove(id) {
    await api.delete(`/groups/${id}`)
    return { id }
  },
}
