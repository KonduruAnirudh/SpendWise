import { groupsApi } from '../api/groupsApi'
import { withMock } from './mockStore'
import { groupsStore, peopleStore, expensesStore, settlementsStore, balancesStore } from './sharingStore'
import { generateId } from '../utils/formatters'

function personSnapshot(id) {
  const person = peopleStore.all().find((item) => item.id === id)
  return person ? { id: person.id, name: person.name, email: person.email, phone: person.phone } : { id, name: 'Unknown' }
}

export const groupService = {
  async list() {
    return withMock(
      () => groupsStore.all(),
      () => groupsApi.list(),
    )
  },

  async get(id) {
    return withMock(
      () => groupsStore.all().find((group) => group.id === id) || null,
      () => groupsApi.get(id),
    )
  },

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
      () => groupsApi.create(payload),
    )
  },

  async getMembers(groupId) {
    return withMock(
      () => groupsStore.all().find((group) => group.id === groupId)?.members || [],
      () => groupsApi.members(groupId),
    )
  },

  async addMember(groupId, personId) {
    return withMock(
      () => {
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
      () => groupsApi.addMember(groupId, { personId }),
    )
  },

  async removeMember(groupId, personId) {
    return withMock(
      () => {
        let next = null
        groupsStore.update((rows) =>
          rows.map((group) => {
            if (group.id !== groupId) return group
            next = { ...group, members: group.members.filter((member) => member.id !== personId) }
            return next
          }),
        )
        return next
      },
      () => groupsApi.removeMember(groupId, personId),
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
      () => groupsApi.remove(id),
    )
  },
}
