import { api } from './api'
import { colorFor } from '../utils/palette'

const API_TYPES = new Set(['bank', 'credit_card', 'cash', 'savings', 'wallet'])

// ---------- Adapter: backend contract → shape the UI already uses ----------
export function toUiAccount(apiAccount) {
  return {
    id: apiAccount.id,
    name: apiAccount.name,
    type: apiAccount.type,
    currency: apiAccount.currency,
    // Derived on the server: opening_balance + income − expenses.
    balance: Number(apiAccount.current_balance),
    openingBalance: Number(apiAccount.opening_balance),
    institution: null,
    lastFour: null,
    color: colorFor(apiAccount.id),
    createdAt: apiAccount.created_at,
  }
}

// Older UI values (e.g. "upi", "other") have no backend equivalent.
function toApiType(type) {
  return API_TYPES.has(type) ? type : 'wallet'
}

export const accountService = {
  async list() {
    return (await api.get('/accounts')).map(toUiAccount)
  },

  async create(payload) {
    return toUiAccount(
      await api.post('/accounts', {
        name: payload.name,
        type: toApiType(payload.type),
        // A new account has no transactions yet, so its current balance is its opening balance.
        // Sent as a string, matching how the API represents money; the server parses it as Decimal.
        opening_balance: String(payload.balance ?? 0),
      }),
    )
  },

  // The balance is derived from transactions, so only name and type are editable.
  async update(id, payload) {
    return toUiAccount(await api.patch(`/accounts/${id}`, { name: payload.name, type: toApiType(payload.type) }))
  },

  async remove(id) {
    await api.delete(`/accounts/${id}`)
    return { id }
  },
}
