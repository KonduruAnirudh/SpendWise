import { delay } from '../utils/formatters'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

// Backend features land one at a time, so services opt in individually via
// VITE_LIVE_SERVICES (e.g. "auth,categories"). Anything not listed keeps using
// mocks, which lets the API replace one screen without breaking the others.
const LIVE_SERVICES = new Set(
  (import.meta.env.VITE_LIVE_SERVICES || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean),
)

export function isLive(service) {
  if (!USE_MOCK) return true
  return Boolean(service) && LIVE_SERVICES.has(service)
}

export async function withMock(mockFn, liveFn, service) {
  if (isLive(service)) return liveFn()
  await delay(420)
  return mockFn()
}

function clone(value) {
  return structuredClone(value)
}

export function createStore(initial) {
  let data = clone(initial)
  return {
    all: () => clone(data),
    set: (next) => {
      data = clone(next)
      return clone(data)
    },
    update: (updater) => {
      data = updater(clone(data))
      return clone(data)
    },
  }
}
