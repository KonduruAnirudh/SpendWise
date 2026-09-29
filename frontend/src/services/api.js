import { AUTH_STORAGE_KEY } from '../utils/constants'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

function getStoredToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw).token : null
  } catch {
    return null
  }
}

function abandonSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

export async function apiClient(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const token = getStoredToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    let message = 'Something went wrong.'
    try {
      const payload = await response.json()
      message = payload.message || message
    } catch {
      /* ignore */
    }

    // A rejected token means the stored session is stale — a leftover mock
    // token, or one that expired. Drop it and let the user sign in again
    // instead of leaving every page stuck on an error state. Auth endpoints
    // are excluded so a failed login still reports its own message.
    if (response.status === 401 && token && !path.startsWith('/auth/')) {
      abandonSession()
    }

    const error = new Error(message)
    error.status = response.status
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  get: (path) => apiClient(path),
  post: (path, body) => apiClient(path, { method: 'POST', body }),
  put: (path, body) => apiClient(path, { method: 'PUT', body }),
  patch: (path, body) => apiClient(path, { method: 'PATCH', body }),
  delete: (path) => apiClient(path, { method: 'DELETE' }),
}
