import { cn } from '../../../utils/cn'
import { SPLIT_METHODS } from '../../../utils/constants'

export function SplitMethodSelector({ value, onChange, methods = SPLIT_METHODS }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">Split method</p>
      <div className="flex flex-wrap gap-1.5">
        {methods.map((method) => (
          <button
            key={method.value}
            type="button"
            onClick={() => onChange(method.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              value === method.value
                ? 'border-accent bg-accent-muted text-accent'
                : 'border-border text-muted hover:border-accent/40 hover:text-fg',
            )}
          >
            {method.shortLabel || method.label}
          </button>
        ))}
      </div>
    </div>
  )
}
