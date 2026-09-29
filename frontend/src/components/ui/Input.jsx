import { cn } from '../../utils/cn'

export function Input({
  label,
  error,
  hint,
  className,
  id,
  rightSlot,
  ...props
}) {
  const inputId = id || props.name

  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={cn(
            'h-11 w-full rounded-xl border bg-surface px-3.5 text-sm text-fg outline-none transition-colors placeholder:text-subtle focus:border-accent/60 focus:ring-2 focus:ring-accent/20',
            error ? 'border-danger/50' : 'border-border',
            rightSlot && 'pr-11',
            className,
          )}
          {...props}
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-2 flex items-center">{rightSlot}</div>
        )}
      </div>
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-subtle">{hint}</span>
      ) : null}
    </label>
  )
}
