import { cn } from '../../utils/cn'

export function Badge({ children, tone = 'neutral', className }) {
  const tones = {
    neutral: 'bg-hover text-muted',
    accent: 'bg-accent-muted text-accent',
    success: 'bg-success/10 text-success',
    danger: 'bg-danger/10 text-danger',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
