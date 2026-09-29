import { useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/EmptyState'
import { IncomeExpenseChart } from '../../components/charts/IncomeExpenseChart'
import { CategoryDonutChart } from '../../components/charts/CategoryDonutChart'
import { MonthlySpendingChart } from '../../components/charts/MonthlySpendingChart'
import { AccountSpendingChart } from '../../components/charts/AccountSpendingChart'
import { useAsync } from '../../hooks/useAsync'
import { analyticsService, currentMonthKey } from '../../services/analyticsService'
import { formatCurrency, formatPercent } from '../../utils/formatters'

export function AnalyticsPage() {
  const [month, setMonth] = useState(currentMonthKey())
  const data = useAsync(() => analyticsService.getAnalytics(month), [month])

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
      <div className="mb-6 max-w-xs">
        <Input
          type="month"
          label="Month"
          hint="Totals for this month; charts show the 12 months up to it."
          value={month}
          max={currentMonthKey()}
          onChange={(event) => event.target.value && setMonth(event.target.value)}
        />
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
          <p className="mt-2 text-2xl font-semibold">
            {summary.momChange === null ? '—' : `${summary.momChange > 0 ? '+' : ''}${summary.momChange}%`}
          </p>
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
