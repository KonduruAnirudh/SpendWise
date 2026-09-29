import { api } from './api'
import { withMock } from './mockStore'
import { currentUser, demoUsers } from '../mock/user'
import { DEMO_CREDENTIALS } from '../utils/constants'
import { generateId } from '../utils/formatters'

const extraUsers = []

const SERVICE = 'auth'

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
          ? { id: registered.id, name: registered.name, email: registered.email, avatarUrl: null, currency: 'INR', dateFormat: 'dd MMM', defaultAccountId: 'acc_hdfc', defaultCategoryId: 'cat_food' }
          : currentUser

        return {
          token: `mock.jwt.${generateId('tok')}`,
          user,
        }
      },
      () => api.post('/auth/login', { email, password }),
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
        extraUsers.push({
          id: generateId('user'),
          name: payload.name,
          email: payload.email,
          password: payload.password,
        })
        return { message: 'Account created' }
      },
      () =>
        api.post('/auth/signup', {
          name: payload.name,
          email: payload.email,
          password: payload.password,
        }),
      SERVICE,
    )
  },

  async me() {
    return withMock(
      () => currentUser,
      () => api.get('/users/me'),
      SERVICE,
    )
  },

  async updateProfile(payload) {
    return withMock(
      () => ({ ...currentUser, ...payload }),
      () => api.patch('/users/me', payload),
      SERVICE,
    )
  },

  async changePassword(currentPassword, newPassword) {
    return withMock(
      () => ({ message: 'Password updated' }),
      () => api.post('/auth/change-password', { currentPassword, newPassword }),
      SERVICE,
    )
  },

  members() {
    return demoUsers
  },
}
