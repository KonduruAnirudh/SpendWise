import { Button } from '../../../components/ui/Button'
import { Skeleton } from '../../../components/ui/Skeleton'

// Loading and error states shared by the Profile sections that load their own data.
export function FormSkeleton({ rows = 2 }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  )
}

export function LoadError({ onRetry }) {
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
      <p className="text-sm text-muted">These preferences couldn't be loaded.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
