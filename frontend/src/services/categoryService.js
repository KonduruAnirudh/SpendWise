import { api } from './api'
import { createStore, withMock } from './mockStore'
import { categories as seed } from '../mock/categories'
import { generateId } from '../utils/formatters'
import { colorFor } from '../utils/palette'

const store = createStore(seed)

const SERVICE = 'categories'

// ---------- Adapter: backend contract → shape the UI already uses ----------
export function toUiCategory(apiCategory) {
  return {
    id: apiCategory.id,
    name: apiCategory.name,
    type: apiCategory.type,
    isSystem: apiCategory.is_system,
    color: colorFor(apiCategory.id),
    // The backend has no sub-categories; the UI renders "No sub-categories".
    subcategories: [],
  }
}

function unavailable(feature) {
  const error = new Error(`${feature} isn't available yet.`)
  error.status = 501
  throw error
}

export const categoryService = {
  async list() {
    return withMock(
      () => store.all(),
      async () => (await api.get('/categories')).map(toUiCategory),
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
      // Colour and sub-categories are UI-only; the backend stores name and type.
      async () => toUiCategory(await api.post('/categories', { name: payload.name, type: payload.type || 'expense' })),
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
      // The API has no update endpoint for categories (future work).
      () => unavailable('Editing categories'),
      SERVICE,
    )
  },

  async remove(id) {
    return withMock(
      () => {
        store.update((rows) => rows.filter((row) => row.id !== id))
        return { id }
      },
      async () => {
        await api.delete(`/categories/${id}`)
        return { id }
      },
      SERVICE,
    )
  },
}
