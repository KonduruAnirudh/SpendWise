import { api, withQuery } from './api'
import { toUiTransaction } from './transactionService'
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
