import { api } from './api'
import { createStore, withMock } from './mockStore'
import { accounts as seed } from '../mock/accounts'
import { generateId } from '../utils/formatters'

const store = createStore(seed)

export const accountService = {
  async list() {
    return withMock(
      () => store.all(),
      () => api.get('/accounts'),
    )
  },

  async create(payload) {
    return withMock(
      () => {
        const item = { id: generateId('acc'), color: '#d4af37', ...payload }
        store.update((rows) => [...rows, item])
        return item
      },
      () => api.post('/accounts', payload),
    )
  },

  async update(id, payload) {
    return withMock(
      () => {
        let next = null
        store.update((rows) =>
          rows.map((row) => {
            if (row.id !== id) return row
            next = { ...row, ...payload }
            return next
          }),
        )
        return next
      },
      () => api.put(`/accounts/${id}`, payload),
    )
  },

  async remove(id) {
    return withMock(
      () => {
        store.update((rows) => rows.filter((row) => row.id !== id))
        return { id }
      },
      () => api.delete(`/accounts/${id}`),
    )
  },
}
