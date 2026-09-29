import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { Header } from '../components/layout/Header'
import { MobileNav } from '../components/layout/MobileNav'
import { FloatingAI } from '../components/ai/FloatingAI'
import { SkeletonCard } from '../components/ui/Skeleton'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { cn } from '../utils/cn'

export function DashboardLayout() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isTablet = useMediaQuery('(min-width: 768px)')
  const [userCollapsed, setUserCollapsed] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const collapsed = userCollapsed ?? (!isDesktop && isTablet)

  return (
    <div className="min-h-svh bg-bg text-fg">
      <div className="flex min-h-svh">
        <div className="hidden md:block">
          <div className="sticky top-0 h-svh">
            <Sidebar collapsed={collapsed} />
          </div>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative h-full w-[260px] animate-fade-in">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            onMenu={() => setMobileOpen(true)}
            onToggleSidebar={() => setUserCollapsed((current) => !(current ?? collapsed))}
          />
          <main className={cn('flex-1 px-4 py-6 sm:px-6 lg:px-8', 'pb-24 md:pb-8')}>
            <div className="mx-auto w-full max-w-6xl animate-fade-in">
              <Suspense fallback={<SkeletonCard rows={6} />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
      <MobileNav onMore={() => setMobileOpen(true)} />
      <FloatingAI />
    </div>
  )
}
