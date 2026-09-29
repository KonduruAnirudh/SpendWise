import { cn } from '../../utils/cn'

export function Card({ className, children, padding = true, ...props }) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border bg-card',
        padding && 'p-5',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}

export function CardHeader({ title, action, description }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
