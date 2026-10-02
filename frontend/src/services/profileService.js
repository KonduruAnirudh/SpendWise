import { api } from './api'
import { toUiUser } from './authService'
import { PREFERENCES_STORAGE_KEY } from '../utils/constants'

/*
  Profile and preferences. GET /users/me exists today. The rest are frontend previews until the
  API supports them; when an endpoint ships, set its flag to true and check its live branch
  against the real contract. The Profile components don't need to change.

    PATCH  /api/v1/users/me               updateProfile      (name)
    POST   /api/v1/users/change-password  changePassword
    GET    /api/v1/users/preferences      getPreferences
    PATCH  /api/v1/users/preferences      updatePreferences
    DELETE /api/v1/users/me               deleteAccount

  These endpoints are conceptual: they don't exist in the backend yet.
*/
export const PROFILE_API = {
  updateProfile: false,
  changePassword: false,
  preferences: false,
  deleteAccount: false,
}

// Local edits shown on top of the server profile until PATCH /users/me exists. Keyed by user id,
// so another account signing in on this browser never sees them.
const PROFILE_OVERRIDES_KEY = 'spendwise.profileOverrides'

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
    const me = toUiUser(await api.get('/users/me'))
    return PROFILE_API.updateProfile ? me : { ...me, ...readJson(PROFILE_OVERRIDES_KEY)[me.id] }
  },

  // Returns { profile, savedLocally }.
  async updateProfile({ userId, name }) {
    if (PROFILE_API.updateProfile) {
      return { profile: toUiUser(await api.patch('/users/me', { full_name: name })), savedLocally: false }
    }
    await simulateRequest()
    const overrides = readJson(PROFILE_OVERRIDES_KEY)
    mergeJson(PROFILE_OVERRIDES_KEY, { [userId]: { ...overrides[userId], name } })
    return { profile: { name }, savedLocally: true }
  },

  // Returns { changed }. The preview never stores, logs or sends the passwords.
  async changePassword({ currentPassword, newPassword }) {
    if (PROFILE_API.changePassword) {
      await api.post('/users/change-password', { current_password: currentPassword, new_password: newPassword })
      return { changed: true }
    }
    await simulateRequest()
    return { changed: false }
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
