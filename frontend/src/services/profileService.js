import { api } from './api'
import { toUiUser } from './authService'
import { PREFERENCES_STORAGE_KEY } from '../utils/constants'

/*
  Profile and preferences. Live: GET/PATCH /users/me and POST /users/me/change-password.
  Still frontend previews until the API supports them (set the flag to true when it ships and
  check the live branch against the real contract; the components don't need to change):

    GET    /api/v1/users/preferences      getPreferences
    PATCH  /api/v1/users/preferences      updatePreferences
    DELETE /api/v1/users/me               deleteAccount
*/
export const PROFILE_API = {
  preferences: false,
  deleteAccount: false,
}

// The same key AuthContext merges into the signed-in user, so the Dashboard and Transactions
// pages see saved preferences (monthly budget, default account) immediately.
export const DEFAULT_PREFERENCES = {
  defaultAccountId: '',
  monthlyBudget: null,
  aiAnalysisEnabled: true,
  aiResponseStyle: 'concise',
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
}

function mergeJson(key, partial) {
  localStorage.setItem(key, JSON.stringify({ ...readJson(key), ...partial }))
}

function pickPreferences(source) {
  return Object.fromEntries(
    Object.keys(DEFAULT_PREFERENCES).map((key) => [key, source[key] ?? DEFAULT_PREFERENCES[key]]),
  )
}

// Previews wait briefly, so saving states behave as they will with a real request.
const simulateRequest = () => new Promise((resolve) => setTimeout(resolve, 600))

export const profileService = {
  async getProfile() {
    return toUiUser(await api.get('/users/me'))
  },

  // Email and currency aren't part of this update (currency has its own conversion flow).
  async updateProfile({ name, username }) {
    return toUiUser(await api.patch('/users/me', { full_name: name, username }))
  },

  // Converts every account and transaction on the server at today's rate. The monthly budget
  // (still a device preference) is converted here at the same rate, so it keeps its meaning.
  async changeCurrency(currency) {
    const result = await api.post('/users/me/currency', { currency })
    const saved = readJson(PREFERENCES_STORAGE_KEY)
    if (saved.monthlyBudget) {
      const converted = Math.round(Number(saved.monthlyBudget) * Number(result.rate) * 100) / 100
      mergeJson(PREFERENCES_STORAGE_KEY, { monthlyBudget: converted })
    }
    return {
      profile: toUiUser(result.user),
      rate: result.rate,
      rateDate: result.rate_date,
      converted: result.converted,
      preferences: pickPreferences(readJson(PREFERENCES_STORAGE_KEY)),
    }
  },

  // A wrong current password is a 400 with a message for the current-password field.
  async changePassword({ currentPassword, newPassword }) {
    await api.post('/users/me/change-password', { current_password: currentPassword, new_password: newPassword })
  },

  async getPreferences() {
    if (PROFILE_API.preferences) return pickPreferences(await api.get('/users/preferences'))
    return pickPreferences(readJson(PREFERENCES_STORAGE_KEY))
  },

  async updatePreferences(partial) {
    if (PROFILE_API.preferences) return pickPreferences(await api.patch('/users/preferences', partial))
    await simulateRequest()
    mergeJson(PREFERENCES_STORAGE_KEY, partial)
    return pickPreferences(readJson(PREFERENCES_STORAGE_KEY))
  },

  // Returns { deleted }. The preview deletes nothing.
  async deleteAccount() {
    if (PROFILE_API.deleteAccount) {
      await api.delete('/users/me')
      return { deleted: true }
    }
    await simulateRequest()
    return { deleted: false }
  },
}
