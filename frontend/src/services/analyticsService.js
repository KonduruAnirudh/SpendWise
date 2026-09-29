import { api, withQuery } from './api'
import { toUiTransaction, transactionService } from './transactionService'
import { colorFor } from '../utils/palette'

// "YYYY-MM" for the user's local month, the format the dashboard endpoints take.
export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key, style = 'short') {
  const [year, month] = key.split('-').map(Number)
  const options = style === 'long' ? { month: 'long', year: 'numeric' } : { month: 'short' }
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-IN', { ...options, timeZone: 'UTC' })
}

function monthBounds(key) {
  const [year, month] = key.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { start: `${key}-01`, end: `${key}-${String(lastDay).padStart(2, '0')}` }
}

// ---------- Adapters: backend contract → shapes the charts and pages already use ----------
// The server computes every total (SQL GROUP BY on Decimal). Number() here is for display only.
function toUiSummary(apiSummary) {
  const income = Number(apiSummary.totals.income)
  const net = Number(apiSummary.totals.net)
  const change = apiSummary.expense_change_percent
  return {
    income,
    expenses: Number(apiSummary.totals.expense),
    savings: net,
    savingsRate: income > 0 ? (net / income) * 100 : 0,
    // null when last month had no spending to compare against.
    momChange: change === null ? null : Number(change),
    totalBalance: Number(apiSummary.total_balance),
  }
}

function toUiTrend(point) {
  return {
    key: point.month,
    month: monthLabel(point.month),
    income: Number(point.income),
    expenses: Number(point.expense),
    savings: Number(point.net),
  }
}

function toUiCategorySpend(item) {
  return {
    id: item.category_id,
    name: item.category_name,
    amount: Number(item.total),
    percentage: Number(item.percentage),
    // Same key as the Categories page, so a category keeps its colour everywhere.
    color: colorFor(item.category_id),
  }
}

// Plain-language insights built from the server's numbers.
function buildInsights(uiSummary, categories) {
  const lines = []
  if (uiSummary.momChange === null) {
    lines.push('There was no spending last month to compare against.')
  } else if (uiSummary.momChange === 0) {
    lines.push('Your spending is the same as last month.')
  } else {
    const direction = uiSummary.momChange > 0 ? 'up' : 'down'
    lines.push(`Your spending is ${direction} ${Math.abs(uiSummary.momChange)}% compared with last month.`)
  }
  if (categories[0]) {
    lines.push(`${categories[0].name} is your largest spending category (${categories[0].percentage}% of expenses).`)
  }
  if (uiSummary.income > 0) {
    lines.push(`Your savings rate this month is ${uiSummary.savingsRate.toFixed(1)}%.`)
  } else {
    lines.push('No income has been recorded this month.')
  }
  return lines
}

// The API has no per-account breakdown, so group the month's expenses by account for the chart.
// Display only; a production version would add spending_by_account to the summary endpoint.
async function accountSpendingFor(monthKey) {
  const { start, end } = monthBounds(monthKey)
  const expenses = await transactionService.list({ type: 'expense', from: start, to: end })
  const totals = new Map()
  expenses.forEach((txn) => {
    totals.set(txn.accountName, (totals.get(txn.accountName) || 0) + txn.amount)
  })
  return [...totals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
}

async function fetchSummary(monthKey) {
  return api.get(withQuery('/dashboard/summary', { month: monthKey }))
}

async function fetchTrends(monthKey, months) {
  return api.get(withQuery('/dashboard/trends', { months, end_month: monthKey }))
}

export const analyticsService = {
  async getSummary(monthKey = currentMonthKey()) {
    return toUiSummary(await fetchSummary(monthKey))
  },

  async getDashboard(monthKey = currentMonthKey()) {
    const [apiSummary, trend] = await Promise.all([fetchSummary(monthKey), fetchTrends(monthKey, 8)])
    return {
      summary: toUiSummary(apiSummary),
      monthlySeries: trend.map(toUiTrend),
      categorySpending: apiSummary.spending_by_category.map(toUiCategorySpend),
      recentTransactions: apiSummary.recent_transactions.map(toUiTransaction),
    }
  },

  async getAnalytics(monthKey = currentMonthKey()) {
    const [apiSummary, trend, byAccount] = await Promise.all([
      fetchSummary(monthKey),
      fetchTrends(monthKey, 12),
      accountSpendingFor(monthKey),
    ])
    const uiSummary = toUiSummary(apiSummary)
    const categories = apiSummary.spending_by_category.map(toUiCategorySpend)
    return {
      summary: uiSummary,
      monthlySeries: trend.map(toUiTrend),
      categorySpending: categories,
      accountSpending: byAccount,
      insights: buildInsights(uiSummary, categories),
    }
  },

  // One card per month with activity, newest first, over the last six months.
  async getReports(monthKey = currentMonthKey()) {
    const trend = await fetchTrends(monthKey, 6)
    const active = trend.filter((point) => Number(point.income) > 0 || Number(point.expense) > 0).reverse()
    const summaries = await Promise.all(active.map((point) => fetchSummary(point.month)))
    return active.map((point, index) => ({
      id: point.month,
      month: monthLabel(point.month, 'long'),
      income: Number(point.income),
      expenses: Number(point.expense),
      savings: Number(point.net),
      topCategory: summaries[index].spending_by_category[0]?.category_name || '—',
    }))
  },
}
