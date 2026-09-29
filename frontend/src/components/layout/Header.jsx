import { Menu, PanelLeft, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { greetingForHour } from '../../utils/formatters'

export function Header({ onMenu, onToggleSidebar, title }) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        className="rounded-lg p-2 text-muted hover:bg-hover hover:text-fg md:hidden"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>
      <button
        type="button"
        className="hidden rounded-lg p-2 text-muted hover:bg-hover hover:text-fg md:inline-flex"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-muted lg:hidden">{title || `${greetingForHour()}, ${user?.name}.`}</p>
        <div className="relative hidden max-w-md lg:block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            readOnly
            placeholder="Search or ask SpendWise AI"
            className="h-10 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-sm text-muted outline-none"
            onClick={() => document.dispatchEvent(new CustomEvent('spendwise:open-ai'))}
          />
        </div>
      </div>
    </header>
  )
}
