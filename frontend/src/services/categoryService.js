import { api } from './api'
import { createStore, withMock } from './mockStore'
import { categories as seed } from '../mock/categories'
import { generateId } from '../utils/formatters'

const store = createStore(seed)

const SERVICE = 'categories'

export const categoryService = {
  async list() {
    return withMock(
      () => store.all(),
      () => api.get('/categories'),
      SERVICE,
    )
  },

  async create(payload) {
    return withMock(
      () => {
        const item = {
          id: generateId('cat'),
          color: payload.color || '#d4af37',
          subcategories: payload.subcategories || [],
          ...payload,
        }
        store.update((rows) => [...rows, item])
        return item
      },
      () => api.post('/categories', payload),
      SERVICE,
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
      () => api.put(`/categories/${id}`, payload),
      SERVICE,
    )
  },

  async remove(id) {
    return withMock(
      () => {
        store.update((rows) => rows.filter((row) => row.id !== id))
        return { id }
      },
      () => api.delete(`/categories/${id}`),
      SERVICE,
    )
  },
}
