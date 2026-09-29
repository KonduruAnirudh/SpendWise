import { api, withQuery } from './api'

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

export const transactionService = {
  // The pages work with a plain array, so walk the paginated envelope {items, total, limit, offset}.
  async list(params = {}) {
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
  },

  async create(payload) {
    return toUiTransaction(await api.post('/transactions', toApiPayload(payload)))
  },

  async update(id, payload) {
    return toUiTransaction(await api.patch(`/transactions/${id}`, toApiPayload(payload)))
  },

  async remove(id) {
    await api.delete(`/transactions/${id}`)
    return { id }
  },
}
