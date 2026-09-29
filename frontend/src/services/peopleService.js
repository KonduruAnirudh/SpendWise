import { peopleApi } from '../api/peopleApi'
import { withMock } from './mockStore'
import { peopleStore, groupsStore } from './sharingStore'
import { generateId } from '../utils/formatters'

function snapshot(person) {
  return { id: person.id, name: person.name, email: person.email, phone: person.phone }
}

export const peopleService = {
  async list(query = '') {
    return withMock(
      () => {
        const q = query.trim().toLowerCase()
        return peopleStore
          .all()
          .filter((person) => !q || person.name.toLowerCase().includes(q) || person.email?.toLowerCase().includes(q))
          .sort((a, b) => a.name.localeCompare(b.name))
      },
      () => peopleApi.list(),
    )
  },

  async get(id) {
    return withMock(
      () => peopleStore.all().find((person) => person.id === id) || null,
      () => peopleApi.list().then((rows) => rows.find((person) => person.id === id) || null),
    )
  },

  async create(payload) {
    return withMock(
      () => {
        if (!payload.name?.trim()) throw new Error('Name is required.')
        const item = {
          id: generateId('user'),
          name: payload.name.trim(),
          email: payload.email?.trim() || '',
          phone: payload.phone?.trim() || '',
        }
        peopleStore.update((rows) => [...rows, item])
        return item
      },
      () => peopleApi.create(payload),
    )
  },

  async update(id, payload) {
    return withMock(
      () => {
        let next = null
        peopleStore.update((rows) =>
          rows.map((row) => {
            if (row.id !== id) return row
            next = { ...row, ...payload, name: payload.name?.trim() || row.name }
            return next
          }),
        )
        if (next) {
          groupsStore.update((groups) =>
            groups.map((group) => ({
              ...group,
              members: (group.members || []).map((member) =>
                member.id === id ? snapshot(next) : member,
              ),
            })),
          )
        }
        return next
      },
      () => peopleApi.update(id, payload),
    )
  },

  async remove(id) {
    return withMock(
      () => {
        peopleStore.update((rows) => rows.filter((row) => row.id !== id))
        groupsStore.update((groups) =>
          groups.map((group) => ({
            ...group,
            members: (group.members || []).filter((member) => member.id !== id),
          })),
        )
        return { id }
      },
      () => peopleApi.remove(id),
    )
  },
}
