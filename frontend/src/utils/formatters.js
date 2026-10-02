const currencyLocale = {
  INR: 'en-IN',
  USD: 'en-US',
  // en-US writes "A$", so Australian and US dollars can't be confused.
  AUD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  CHF: 'en-CH',
}

// The signed-in user's currency, set by AuthProvider. Personal pages (dashboard, accounts,
// transactions, reports) format in it without passing a currency; group pages pass the
// group's own currency explicitly (see useMoney).
let defaultCurrency = 'INR'

export function setDefaultCurrency(currency) {
  if (currency) defaultCurrency = currency
}

export function formatCurrency(amount, currency = defaultCurrency, options = {}) {
  const value = Number(amount) || 0
  return new Intl.NumberFormat(currencyLocale[currency] || 'en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: options.fractionDigits ?? 0,
    ...options,
  }).format(value)
}

export function formatPercent(value, fractionDigits = 1) {
  return `${Number(value).toFixed(fractionDigits)}%`
}

export function formatDate(iso, format = 'dd MMM') {
  const date = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  if (format === 'yyyy-mm-dd') {
    return date.toISOString().slice(0, 10)
  }

  if (format === 'long') {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
}

export function greetingForHour(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function savingsRate(income, expenses) {
  if (!income) return 0
  return ((income - expenses) / income) * 100
}

// "₹" for INR, "$" for USD, "CHF" for CHF; falls back to the code itself.
export function currencySymbol(currency = defaultCurrency) {
  try {
    const part = new Intl.NumberFormat(currencyLocale[currency] || 'en-IN', { style: 'currency', currency })
      .formatToParts(0)
      .find((item) => item.type === 'currency')
    return part?.value || currency
  } catch {
    return currency
  }
}

// "September 2026"
export function formatMonthYear(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}
