import { api } from './api'
import { colorFor } from '../utils/palette'

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
    return (await api.get('/categories')).map(toUiCategory)
  },

  // Colour and sub-categories are UI-only; the backend stores name and type.
  async create(payload) {
    return toUiCategory(await api.post('/categories', { name: payload.name, type: payload.type || 'expense' }))
  },

  // The API has no update endpoint for categories (future work).
  async update() {
    return unavailable('Editing categories')
  },

  async remove(id) {
    await api.delete(`/categories/${id}`)
    return { id }
  },
}
