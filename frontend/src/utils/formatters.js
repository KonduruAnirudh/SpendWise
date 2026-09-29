const currencyLocale = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
}

export function formatCurrency(amount, currency = 'INR', options = {}) {
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
