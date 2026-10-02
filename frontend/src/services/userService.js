import { api, withQuery } from './api'
import { normalizeUsername } from '../utils/validators'

export const userService = {
  // Exact match only. Returns {username, name}; a 404 means no account uses that handle.
  async lookup(username) {
    const found = await api.get(withQuery('/users/lookup', { username: normalizeUsername(username) }))
    return { username: found.username, name: found.full_name }
  },
}
