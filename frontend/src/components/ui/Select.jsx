import { cn } from '../../utils/cn'

export function Select({ label, error, hint, className, children, ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
      )}
      <select
        className={cn(
          'h-11 w-full rounded-xl border bg-surface px-3.5 text-sm text-fg outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/20',
          error ? 'border-danger/50' : 'border-border',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-subtle">{hint}</span>
      ) : null}
    </label>
  )
}
