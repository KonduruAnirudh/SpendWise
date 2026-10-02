import { createContext, useContext, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { currencySymbol, formatCurrency } from '../utils/formatters'

const CurrencyContext = createContext(null)

// Money inside a group is in the group's currency, which can differ from the user's own.
export function CurrencyProvider({ currency, children }) {
  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>
}

// {currency, symbol, format}: the nearest CurrencyProvider's currency, else the user's.
// Split previews show minor units (2 decimals), because that's what the server stores.
export function useMoney() {
  const scoped = useContext(CurrencyContext)
  const { user } = useAuth()
  const currency = scoped || user?.currency || 'INR'
  return useMemo(
    () => ({
      currency,
      symbol: currencySymbol(currency),
      format: (amount, options = {}) => formatCurrency(amount, currency, { fractionDigits: 2, ...options }),
    }),
    [currency],
  )
}
