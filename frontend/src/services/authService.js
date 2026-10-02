import { api } from './api'

// ---------- Adapter: backend contract → shape the UI already uses ----------
export function toUiUser(apiUser) {
  return {
    id: apiUser.id,
    name: apiUser.full_name,
    username: apiUser.username,
    email: apiUser.email,
    avatarUrl: null,
    currency: apiUser.currency,
    createdAt: apiUser.created_at,
  }
}

export const authService = {
  async login(email, password) {
    // OAuth2 password flow: form-encoded, with the email in the `username` field.
    const { access_token: token } = await api.postForm('/auth/login', { username: email, password })
    // The token isn't stored yet, so pass it explicitly to load the profile.
    const me = await api.get('/users/me', { headers: { Authorization: `Bearer ${token}` } })
    return { token, user: toUiUser(me) }
  },

  async me() {
    return toUiUser(await api.get('/users/me'))
  },

  async signup(payload) {
    await api.post('/auth/register', {
      full_name: payload.name,
      username: payload.username,
      email: payload.email,
      password: payload.password,
    })
    return { message: 'Account created' }
  },
}
