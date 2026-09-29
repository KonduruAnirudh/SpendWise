import { Link, useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { IncomeTrackingPrompt } from '../../components/layout/IncomeTrackingPrompt'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/EmptyState'
import { IncomeExpenseChart } from '../../components/charts/IncomeExpenseChart'
import { CategoryDonutChart } from '../../components/charts/CategoryDonutChart'
import { MonthlySpendingChart } from '../../components/charts/MonthlySpendingChart'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { analyticsService } from '../../services/analyticsService'
import { expenseService } from '../../services/expenseService'
import { categoryService } from '../../services/categoryService'
import { accountService } from '../../services/accountService'
import { formatCurrency, formatDate, formatPercent, greetingForHour } from '../../utils/formatters'
import { DASHBOARD_QUOTE } from '../../utils/constants'

export function DashboardPage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const dashboard = useAsync(() => analyticsService.getDashboard(), [])
  const sharing = useAsync(() => expenseService.getSummary(), [])
  const categories = useAsync(() => categoryService.list(), [])
  const accounts = useAsync(() => accountService.list(), [])

  if (dashboard.loading || sharing.loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (dashboard.error) {
    return <ErrorState message="Unable to load your dashboard." onRetry={dashboard.refetch} />
  }

  const { summary, monthlySeries, categorySpending, recentTransactions } = dashboard.data
  const categoryName = (id) => categories.data?.find((item) => item.id === id)?.name || 'Other'
  const recent = (recentTransactions || []).slice(0, 4)
  const tracking = user?.incomeTracking
  const showIncome = tracking === 'regular' || (tracking === 'occasional' && summary.income > 0)
  const availableFunds = (accounts.data || [])
    .filter((account) => account.type !== 'credit_card')
    .reduce((sum, account) => sum + Number(account.balance || 0), 0)
  const remaining = user?.monthlyBudget ? user.monthlyBudget - summary.expenses : availableFunds

  return (
    <div>
      <PageHeader
        title={`${greetingForHour()}, ${user?.name}.`}
        description="Here's your financial overview."
      />
      <p className="mb-8 text-sm text-subtle italic">“{DASHBOARD_QUOTE}”</p>

      {!tracking && <IncomeTrackingPrompt onSave={updateUser} />}

      {showIncome ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat label="Income" value={formatCurrency(summary.income)} />
          <SummaryStat label="Expenses" value={formatCurrency(summary.expenses)} />
          <SummaryStat label="Balance" value={formatCurrency(summary.savings)} />
          <SummaryStat
            label="Savings rate"
            value={formatPercent(summary.savingsRate)}
            hint={<ChangeHint change={summary.momChange} />}
          />
        </div>
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryStat label="Expenses" value={formatCurrency(summary.expenses)} hint={<span className="mt-2 text-xs text-muted">Spent this month</span>} />
          <SummaryStat
            label={user?.monthlyBudget ? 'Remaining' : 'Available funds'}
            value={formatCurrency(remaining)}
          />
          <SummaryStat
            label="Monthly spending"
            value={formatChange(summary.momChange)}
            hint={<ChangeHint change={summary.momChange} />}
          />
        </div>
      )}

      <Card className="mb-6 border-accent/30 bg-accent-muted/40">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Expense sharing</p>
            <div className="mt-3 flex gap-8">
              <div>
                <p className="text-xs text-muted">You owe</p>
                <p className="text-xl font-semibold">{formatCurrency(sharing.data?.youOwe || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">You are owed</p>
                <p className="text-xl font-semibold">{formatCurrency(sharing.data?.youAreOwed || 0)}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate('/groups?create=1')}>
              + Create group
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/groups')}>
              + Add expense
            </Button>
            <Link to="/groups" className="inline-flex items-center text-sm font-medium text-accent hover:underline">
              View groups →
            </Link>
          </div>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader
            title={showIncome ? 'Income vs expenses' : 'Monthly spending'}
            description="Last eight months"
          />
          {showIncome ? (
            <IncomeExpenseChart data={monthlySeries} />
          ) : (
            <MonthlySpendingChart data={monthlySeries} />
          )}
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Category spending" />
          <CategoryDonutChart data={categorySpending} />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {showIncome && (
          <Card className="xl:col-span-3">
            <CardHeader title="Monthly spending" />
            <MonthlySpendingChart data={monthlySeries} />
          </Card>
        )}
        <Card className={showIncome ? 'xl:col-span-2' : 'xl:col-span-5'}>
          <CardHeader
            title="Recent transactions"
            action={
              <Link to="/transactions" className="text-sm text-accent hover:underline">
                View all transactions →
              </Link>
            }
          />
          <ul className="space-y-3">
            {recent.map((txn) => (
              <li key={txn.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{txn.description}</p>
                  <p className="text-xs text-muted">
                    {categoryName(txn.categoryId)} · {formatDate(txn.date, user?.dateFormat)}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 font-medium ${txn.type === 'income' ? 'text-success' : ''}`}>
                  {txn.type === 'income' ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                  {txn.type === 'income' ? '+' : '−'} {formatCurrency(txn.amount)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <p className="mb-3 text-xs uppercase tracking-[0.14em] text-subtle">Top categories</p>
            <ul className="space-y-2 text-sm">
              {categorySpending.slice(0, 4).map((item) => (
                <li key={item.name} className="flex justify-between">
                  <span className="text-muted">{item.name}</span>
                  <span>{formatCurrency(item.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}

function formatChange(change) {
  if (change === null || change === undefined) return '—'
  return `${change > 0 ? '+' : ''}${change}%`
}

// Spending going up is bad news (red, up arrow); going down is good news (green, down arrow).
function ChangeHint({ change }) {
  if (change === null || change === undefined) {
    return (
      <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
        <Minus className="size-3.5" />
        No spending last month to compare
      </span>
    )
  }
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus
  const tone = change > 0 ? 'text-danger' : change < 0 ? 'text-success' : 'text-muted'
  const text = change === 0 ? 'Same as last month' : `${formatChange(change)} spending vs last month`
  return (
    <span className={`mt-2 inline-flex items-center gap-1 text-xs ${tone}`}>
      <Icon className="size-3.5" />
      {text}
    </span>
  )
}

function SummaryStat({ label, value, hint }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
      {hint}
    </Card>
  )
}
