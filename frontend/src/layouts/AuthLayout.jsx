import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Logo } from '../components/ui/Logo'
import { Skeleton } from '../components/ui/Skeleton'
import { APP_TAGLINE } from '../utils/constants'

export function AuthLayout() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-bg text-fg">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--sw-accent-muted),transparent_55%)]" />
      <div className="relative mx-auto flex min-h-svh max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-10 flex flex-col items-center text-center">
          <Logo className="mb-6" />
          <p className="max-w-xs text-sm leading-relaxed text-muted">{APP_TAGLINE}</p>
        </div>
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-2xl" />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  )
}
