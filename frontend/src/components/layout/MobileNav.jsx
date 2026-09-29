import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Users, Sparkles, Menu } from 'lucide-react'
import { cn } from '../../utils/cn'

const items = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/transactions', label: 'Money', icon: ArrowLeftRight },
  { to: '/groups', label: 'Sharing', icon: Users },
  { to: '/ai', label: 'AI', icon: Sparkles },
]

export function MobileNav({ onMore }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 py-1.5 backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 rounded-xl py-2 text-[11px]',
                isActive ? 'text-accent' : 'text-muted',
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onMore}
          className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] text-muted"
        >
          <Menu className="size-4" />
          More
        </button>
      </div>
    </nav>
  )
}
