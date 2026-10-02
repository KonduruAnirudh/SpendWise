import { api, withQuery } from './api'

export const fxService = {
  // Today's ECB reference rate: {base, quote, rate (string), date}. 503 if rates are unavailable.
  async rate(base, quote) {
    return api.get(withQuery('/fx/rate', { base, quote }))
  },
}
