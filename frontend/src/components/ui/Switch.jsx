import { useId } from 'react'
import { cn } from '../../utils/cn'

// An on/off setting with a label and optional description. Uses role="switch" for screen readers.
export function Switch({ checked, onChange, label, description, disabled = false }) {
  const labelId = useId()
  const descriptionId = useId()

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-medium text-fg">
          {label}
        </p>
        {description && (
          <p id={descriptionId} className="mt-0.5 text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50',
          checked ? 'bg-accent' : 'bg-border',
        )}
      >
        <span
          className={cn(
            'inline-block size-4 rounded-full shadow-sm transition-transform',
            checked ? 'translate-x-6 bg-accent-fg' : 'translate-x-1 bg-muted',
          )}
        />
      </button>
    </div>
  )
}
