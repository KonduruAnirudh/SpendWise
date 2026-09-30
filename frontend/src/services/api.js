import { AUTH_STORAGE_KEY } from '../utils/constants'

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

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

// FastAPI errors: {"detail": "message"} or, for 422, {"detail": [{loc, msg}, ...]}
function extractMessage(payload, fallback) {
  const detail = payload?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((error) => {
        const field = error.loc?.slice(1).join('.')
        return field ? `${field}: ${error.msg}` : error.msg
      })
      .join('; ')
  }
  return payload?.message || fallback
}

export function withQuery(path, params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })
  const text = query.toString()
  return text ? `${path}?${text}` : path
}

export async function apiClient(path, { body, form, headers: extraHeaders, ...options } = {}) {
  const headers = { ...(extraHeaders || {}) }
  let payload

  if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    payload = new URLSearchParams(form)
  } else if (body instanceof FormData) {
    // Multipart (file uploads): no Content-Type here, so the browser adds it with the part boundary.
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const token = getStoredToken()
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, body: payload })

  if (!response.ok) {
    let message = 'Something went wrong.'
    let details
    try {
      const data = await response.json()
      message = extractMessage(data, message)
      details = data.detail
    } catch {
      /* non-JSON error body */
    }

    // A rejected token means the session is stale (expired, or a leftover mock token).
    // Auth endpoints are excluded so a failed login still shows its own message.
    if (response.status === 401 && headers.Authorization && !path.startsWith('/auth/')) {
      abandonSession()
    }

    const error = new Error(message)
    error.status = response.status
    error.details = details
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  get: (path, options) => apiClient(path, options),
  post: (path, body, options) => apiClient(path, { ...options, method: 'POST', body }),
  postForm: (path, form, options) => apiClient(path, { ...options, method: 'POST', form }),
  upload: (path, formData, options) => apiClient(path, { ...options, method: 'POST', body: formData }),
  put: (path, body, options) => apiClient(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => apiClient(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiClient(path, { ...options, method: 'DELETE' }),
}