import { cn } from '../../utils/cn'
import { initials } from '../../utils/formatters'

export function Avatar({ name, className }) {
  return (
    <span
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-full bg-accent-muted text-xs font-semibold text-accent',
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
