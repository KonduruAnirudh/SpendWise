import { useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardHeader } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/EmptyState'
import { IncomeExpenseChart } from '../../components/charts/IncomeExpenseChart'
import { CategoryDonutChart } from '../../components/charts/CategoryDonutChart'
import { MonthlySpendingChart } from '../../components/charts/MonthlySpendingChart'
import { AccountSpendingChart } from '../../components/charts/AccountSpendingChart'
import { useAsync } from '../../hooks/useAsync'
import { analyticsService } from '../../services/analyticsService'
import { accountService } from '../../services/accountService'
import { categoryService } from '../../services/categoryService'
import { formatCurrency, formatPercent } from '../../utils/formatters'

export function AnalyticsPage() {
  const data = useAsync(() => analyticsService.getAnalytics(), [])
  const accounts = useAsync(() => accountService.list(), [])
  const categories = useAsync(() => categoryService.list(), [])
  const [filters, setFilters] = useState({ from: '2026-01-01', to: '2026-08-31', accountId: '', categoryId: '', type: '' })

  if (data.loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }
  if (data.error) return <ErrorState message="Unable to load analytics." onRetry={data.refetch} />

  const { monthlySeries, categorySpending, accountSpending, insights, summary } = data.data

  return (
    <div>
      <PageHeader eyebrow="Analytics" title="Analytics" description="See where money goes, and where it stays." />
      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
        <Input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
        <Select value={filters.accountId} onChange={(event) => setFilters({ ...filters, accountId: event.target.value })}>
          <option value="">All accounts</option>
          {(accounts.data || []).map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
        <Select value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })}>
          <option value="">All categories</option>
          {(categories.data || []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}>
          <option value="">All types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </Select>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Savings</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.savings)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Savings rate</p>
          <p className="mt-2 text-2xl font-semibold">{formatPercent(summary.savingsRate)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Month over month</p>
          <p className="mt-2 text-2xl font-semibold">{summary.momChange}%</p>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="Insights" />
        <ul className="space-y-2 text-sm text-muted">
          {insights.map((insight) => (
            <li key={insight}>• {insight}</li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Income vs expenses" />
          <IncomeExpenseChart data={monthlySeries} />
        </Card>
        <Card>
          <CardHeader title="Monthly spending" />
          <MonthlySpendingChart data={monthlySeries} />
        </Card>
        <Card>
          <CardHeader title="Category spending" />
          <CategoryDonutChart data={categorySpending} />
        </Card>
        <Card>
          <CardHeader title="Account spending" />
          <AccountSpendingChart data={accountSpending} />
        </Card>
      </div>
    </div>
  )
}
