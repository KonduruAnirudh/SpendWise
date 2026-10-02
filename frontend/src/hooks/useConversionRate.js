import { useAsync } from './useAsync'
import { fxService } from '../services/fxService'

// The rate a currency change will use, fetched before anything is converted. The server
// fetches it again when it converts (the ECB publishes once a day, so it's the same rate).
export function useConversionRate(from, to) {
  return useAsync(() => (from && to && from !== to ? fxService.rate(from, to) : Promise.resolve(null)), [from, to])
}
