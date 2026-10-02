import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { useAsync } from '../../hooks/useAsync'
import { analyticsService } from '../../services/analyticsService'
import { formatCurrency } from '../../utils/formatters'

export function ReportsPage() {
  const reports = useAsync(() => analyticsService.getReports(), [])

  if (reports.loading) return <SkeletonCard rows={4} />
  if (reports.error) return <ErrorState message="Unable to load reports." onRetry={reports.refetch} />

  return (
    <div>
      <PageHeader eyebrow="Overview" title="Monthly reports" description="A quiet recap of each month." />
      {reports.data.length === 0 && <EmptyState title="No activity in the last six months." />}
      <div className="grid gap-4 md:grid-cols-2">
        {reports.data.map((report) => (
          <Card key={report.id}>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{report.month}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Income</dt>
                <dd className="mt-1 text-lg font-semibold">{formatCurrency(report.income)}</dd>
              </div>
              <div>
                <dt className="text-muted">Expenses</dt>
                <dd className="mt-1 text-lg font-semibold">{formatCurrency(report.expenses)}</dd>
              </div>
              <div>
                <dt className="text-muted">Savings</dt>
                <dd className="mt-1 text-lg font-semibold">{formatCurrency(report.savings)}</dd>
              </div>
              <div>
                <dt className="text-muted">Top category</dt>
                <dd className="mt-1 text-lg font-semibold">{report.topCategory}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>
    </div>
  )
}
