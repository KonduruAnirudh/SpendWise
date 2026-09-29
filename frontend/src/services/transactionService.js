import { api, withQuery } from './api'
import { createStore, withMock } from './mockStore'
import { transactions as seed } from '../mock/transactions'
import { generateId } from '../utils/formatters'

const store = createStore(seed)
const SERVICE = 'transactions'

// The API's maximum page size.
const PAGE_LIMIT = 200

// ---------- Adapter: backend contract → shape the UI already uses ----------
export function toUiTransaction(apiTxn) {
  return {
    id: apiTxn.id,
    date: apiTxn.occurred_on,
    description: apiTxn.description,
    notes: apiTxn.notes || '',
    // Derived on the server from the category; the client never sends it.
    type: apiTxn.type,
    amount: Number(apiTxn.amount),
    categoryId: apiTxn.category.id,
    categoryName: apiTxn.category.name,
    accountId: apiTxn.account.id,
    accountName: apiTxn.account.name,
    createdAt: apiTxn.created_at,
  }
}

function toApiFilters(params) {
  return {
    search: params.search?.trim(),
    type: params.type,
    start_date: params.from,
    end_date: params.to,
    account_id: params.accountId,
    category_id: params.categoryId,
  }
}

// Whitelist of fields the API accepts. `type` is deliberately absent: the category decides it.
function toApiPayload(payload) {
  return {
    account_id: Number(payload.accountId),
    category_id: Number(payload.categoryId),
    // Sent as a string, matching how the API represents money; the server parses it as Decimal.
    amount: String(payload.amount),
    description: payload.description.trim(),
    notes: payload.notes?.trim() || null,
    occurred_on: payload.date,
  }
}

// The pages work with a plain array, so walk the paginated envelope {items, total, limit, offset}.
async function listAll(params) {
  const filters = toApiFilters(params)
  const rows = []
  let total = Infinity
  while (rows.length < total) {
    const page = await api.get(withQuery('/transactions', { ...filters, limit: PAGE_LIMIT, offset: rows.length }))
    rows.push(...page.items.map(toUiTransaction))
    total = page.total
    if (page.items.length === 0) break
  }
  // The API orders by date (newest first); amount sorting is a view concern.
  if (params.sort === 'amount') rows.sort((a, b) => b.amount - a.amount)
  return rows
}

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
      () => listAll(params),
      SERVICE,
    )
  },

  async create(payload) {
    return withMock(
      () => {
        const item = { id: generateId('txn'), ...payload }
        store.update((rows) => [item, ...rows])
        return item
      },
      async () => toUiTransaction(await api.post('/transactions', toApiPayload(payload))),
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
      async () => toUiTransaction(await api.patch(`/transactions/${id}`, toApiPayload(payload))),
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
        await api.delete(`/transactions/${id}`)
        return { id }
      },
      SERVICE,
    )
  },
}
