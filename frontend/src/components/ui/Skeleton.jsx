import { cn } from '../../utils/cn'

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-xl bg-hover', className)} />
}

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Skeleton className="mb-4 h-4 w-32" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="mb-2 h-10 w-full" />
      ))}
    </div>
  )
}
