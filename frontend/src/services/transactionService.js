import { api } from './api'
import { createStore, withMock } from './mockStore'
import { transactions as seed } from '../mock/transactions'
import { generateId } from '../utils/formatters'

const store = createStore(seed)

export const transactionService = {
  async list(params = {}) {
    return withMock(
      () => {
        let rows = store.all()
        if (params.search) {
          const q = params.search.toLowerCase()
          rows = rows.filter((row) => row.description.toLowerCase().includes(q))
        }
        if (params.categoryId) rows = rows.filter((row) => row.categoryId === params.categoryId)
        if (params.accountId) rows = rows.filter((row) => row.accountId === params.accountId)
        if (params.type) rows = rows.filter((row) => row.type === params.type)
        if (params.from) rows = rows.filter((row) => row.date >= params.from)
        if (params.to) rows = rows.filter((row) => row.date <= params.to)
        if (params.sort === 'amount') rows.sort((a, b) => b.amount - a.amount)
        else rows.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
        return rows
      },
      () => api.get(`/transactions${toQuery(params)}`),
    )
  },

  async create(payload) {
    return withMock(
      () => {
        const item = { id: generateId('txn'), ...payload }
        store.update((rows) => [item, ...rows])
        return item
      },
      () => api.post('/transactions', payload),
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
      () => api.put(`/transactions/${id}`, payload),
    )
  },

  async remove(id) {
    return withMock(
      () => {
        store.update((rows) => rows.filter((row) => row.id !== id))
        return { id }
      },
      () => api.delete(`/transactions/${id}`),
    )
  },
}

function toQuery(params) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value)
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
