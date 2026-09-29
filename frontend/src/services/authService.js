import { api } from './api'
import { withMock } from './mockStore'
import { currentUser, demoUsers } from '../mock/user'
import { DEMO_CREDENTIALS } from '../utils/constants'
import { generateId } from '../utils/formatters'

const extraUsers = []
const SERVICE = 'auth'

// ---------- Adapter: backend contract → shape the UI already uses ----------
export function toUiUser(apiUser) {
  return {
    id: apiUser.id,
    name: apiUser.full_name,
    email: apiUser.email,
    avatarUrl: null,
    currency: apiUser.currency,
    dateFormat: 'dd MMM',
    createdAt: apiUser.created_at,
  }
}

async function liveLogin(email, password) {
  // OAuth2 password flow: form-encoded, with the email in the `username` field.
  const { access_token: token } = await api.postForm('/auth/login', { username: email, password })
  // The token isn't stored yet, so pass it explicitly to load the profile.
  const me = await api.get('/users/me', { headers: { Authorization: `Bearer ${token}` } })
  return { token, user: toUiUser(me) }
}

function unavailable(feature) {
  const error = new Error(`${feature} isn't available yet.`)
  error.status = 501
  throw error
}

export const authService = {
  async login(email, password) {
    return withMock(
      () => {
        const known =
          (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) ||
          extraUsers.some((user) => user.email === email && user.password === password)

        if (!known) {
          const error = new Error('Invalid email or password')
          error.status = 401
          throw error
        }

        const registered = extraUsers.find((user) => user.email === email)
        const user = registered
          ? { id: registered.id, name: registered.name, email: registered.email, avatarUrl: null, currency: 'INR', dateFormat: 'dd MMM' }
          : currentUser

        return { token: `mock.jwt.${generateId('tok')}`, user }
      },
      () => liveLogin(email, password),
      SERVICE,
    )
  },

  async signup(payload) {
    return withMock(
      () => {
        if (payload.email === DEMO_CREDENTIALS.email || extraUsers.some((user) => user.email === payload.email)) {
          const error = new Error('An account with this email already exists.')
          error.status = 409
          throw error
        }
        extraUsers.push({ id: generateId('user'), name: payload.name, email: payload.email, password: payload.password })
        return { message: 'Account created' }
      },
      async () => {
        await api.post('/auth/register', {
          full_name: payload.name,
          email: payload.email,
          password: payload.password,
        })
        return { message: 'Account created' }
      },
      SERVICE,
    )
  },

  async me() {
    return withMock(
      () => currentUser,
      async () => toUiUser(await api.get('/users/me')),
      SERVICE,
    )
  },

  async updateProfile(payload) {
    // Display preferences (date format, budget, defaults) are client-side for the MVP.
    // Server-side profile editing (PATCH /users/me) is listed as future work.
    return withMock(
      () => ({ ...currentUser, ...payload }),
      async () => ({ ...payload }),
      SERVICE,
    )
  },

  async changePassword() {
    return withMock(
      () => ({ message: 'Password updated' }),
      () => unavailable('Changing your password'),
      SERVICE,
    )
  },

  members() {
    return demoUsers
  },
}