import { cn } from '../../utils/cn'

const variants = {
  primary:
    'bg-accent text-accent-fg hover:brightness-110 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]',
  secondary: 'bg-hover text-fg hover:bg-border/60',
  outline: 'border border-border bg-transparent text-fg hover:bg-hover',
  ghost: 'text-muted hover:bg-hover hover:text-fg',
  danger: 'bg-danger text-white hover:brightness-110',
}

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  loading = false,
  disabled = false,
  children,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
      // After the spread, so an explicit `disabled` can't switch off the loading guard.
      disabled={loading || disabled}
    >
      {loading && (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}
