import { RefreshCw } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { fxService } from '../../services/fxService'
import { currencyName } from '../../utils/constants'
import { currencySymbol, formatDate } from '../../utils/formatters'

// Shows the rate a currency change will use, before anything is converted. The server fetches
// the rate again when it converts (the ECB publishes once a day, so it's the same rate).
export function useConversionRate(from, to) {
  return useAsync(() => (from && to && from !== to ? fxService.rate(from, to) : Promise.resolve(null)), [from, to])
}

export function ConversionNotice({ from, to, rate, scope }) {
  if (!from || !to || from === to) return null
  // useAsync keeps the previous result while a new one loads; only show the matching pair.
  const quote = rate.data?.base === from && rate.data?.quote === to ? rate.data : null

  return (
    <div className="rounded-xl border border-accent/30 bg-accent-muted/40 px-3.5 py-3 text-sm" role="status">
      <p className="flex items-center gap-2 font-medium text-fg">
        <RefreshCw className="size-4 text-accent" aria-hidden="true" />
        Convert from {currencyName(from)} to {currencyName(to)}
      </p>
      {rate.error ? (
        <p className="mt-1.5 text-danger">
          {rate.error.message || "Exchange rates are unavailable right now, so the currency can't be changed."}
        </p>
      ) : !quote ? (
        <p className="mt-1.5 text-muted">Getting today's exchange rate…</p>
      ) : (
        <>
          <p className="mt-1.5 text-muted">
            1 {from} = {formatRate(quote.rate)} {to}
            <span className="text-subtle">
              {' '}
              (1 {to} = {currencySymbol(from)}
              {formatRate(1 / Number(quote.rate))}) · European Central Bank rate for {formatDate(quote.date, 'long')}
            </span>
          </p>
          <p className="mt-1.5 text-muted">{scope}</p>
          <p className="mt-1.5 text-xs text-subtle">
            Amounts are rounded to 2 decimals, so converting back later may not give exactly the original numbers.
          </p>
        </>
      )}
    </div>
  )
}

// 4 significant digits: 0.01038, 96.33, 1.129.
function formatRate(value) {
  return Number(Number(value).toPrecision(4)).toString()
}
