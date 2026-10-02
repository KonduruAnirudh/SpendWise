import { Skeleton } from '../../../components/ui/Skeleton'

// Mirrors the profile layout while the profile loads, so nothing jumps when it arrives.
export function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your profile">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-16 border-b border-border bg-hover sm:h-20" />
        <div className="flex items-end gap-5 px-5 pb-5 sm:px-6">
          <Skeleton className="-mt-9 size-18 rounded-full sm:-mt-10 sm:size-20" />
          <div className="flex-1 space-y-2 pb-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-border">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-2 px-4 py-3 sm:px-6">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
      {[0, 1].map((index) => (
        <div key={index} className="grid gap-4 border-t border-border py-8 xl:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] xl:gap-10">
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
