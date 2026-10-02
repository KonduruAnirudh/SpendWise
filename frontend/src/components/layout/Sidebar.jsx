import { Link, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Shapes,
  Newspaper,
  Users,
  Split,
  CircleCheck,
  Sparkles,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  LayoutGrid,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../utils/cn'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const NAV = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      // Month-by-month recap: sits with the dashboard, since both summarise your money.
      { to: '/reports', label: 'Monthly reports', icon: Newspaper },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { to: '/accounts', label: 'Accounts', icon: Wallet },
      { to: '/categories', label: 'Categories', icon: Shapes },
    ],
  },
  {
    label: 'Expense Sharing',
    prominent: true,
    items: [
      { to: '/sharing', label: 'Overview', icon: LayoutGrid },
      { to: '/groups', label: 'Groups', icon: Users },
      { to: '/shared-expenses', label: 'Shared Expenses', icon: Split },
      { to: '/settlements', label: 'Settlements', icon: CircleCheck },
    ],
  },
  {
    label: 'AI',
    items: [{ to: '/ai', label: 'SpendWise AI', icon: Sparkles }],
  },
]

export function Sidebar({ collapsed, onNavigate }) {
  const { user, logout } = useAuth()
  const { preference, setPreference, resolved } = useTheme()

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-sidebar transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-[260px]',
      )}
    >
      <div className={cn('flex h-16 items-center border-b border-border px-4', collapsed && 'justify-center px-2')}>
        <Link
          to="/dashboard"
          onClick={onNavigate}
          aria-label="SpendWise home"
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <Logo compact={collapsed} />
        </Link>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((section) => (
          <div key={section.label} className="mb-5">
            {!collapsed && (
              <p
                className={cn(
                  'mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em]',
                  section.prominent ? 'text-accent' : 'text-subtle',
                )}
              >
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors',
                      collapsed && 'justify-center px-0',
                      isActive
                        ? 'bg-accent-muted text-accent'
                        : 'text-muted hover:bg-hover hover:text-fg',
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors',
              collapsed && 'justify-center px-0',
              isActive ? 'bg-accent-muted text-accent' : 'text-muted hover:bg-hover hover:text-fg',
            )
          }
        >
          <Settings className="size-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </nav>

      <div className="space-y-3 border-t border-border p-3">
        <div className={cn('flex items-center gap-1', collapsed && 'flex-col')}>
          {[
            { value: 'light', icon: Sun, label: 'Light' },
            { value: 'dark', icon: Moon, label: 'Dark' },
            { value: 'system', icon: Monitor, label: 'System' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              title={option.label}
              onClick={() => setPreference(option.value)}
              className={cn(
                'flex flex-1 items-center justify-center rounded-lg p-2 text-muted hover:bg-hover hover:text-fg',
                preference === option.value && 'bg-accent-muted text-accent',
              )}
              aria-label={`${option.label} theme`}
            >
              <option.icon className="size-4" />
            </button>
          ))}
        </div>

        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-hover',
            collapsed && 'justify-center',
          )}
        >
          <Avatar name={user?.name} />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-subtle">{user?.email}</p>
            </div>
          )}
        </NavLink>

        <button
          type="button"
          onClick={logout}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-muted hover:bg-hover hover:text-fg',
            collapsed && 'justify-center',
          )}
        >
          <LogOut className="size-4" />
          {!collapsed && <span>Logout</span>}
        </button>
        <p className="sr-only">Current appearance: {resolved}</p>
      </div>
    </aside>
  )
}
