import { forwardRef } from 'react'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { cn } from '../../../utils/cn'

// One settings area: what it is on the left (on wide screens), the controls in a card on the right.
export const ProfileSection = forwardRef(function ProfileSection(
  { id, icon: Icon, title, description, preview, tone = 'default', children },
  ref,
) {
  const danger = tone === 'danger'
  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={`${id}-title`}
      className="grid scroll-mt-6 gap-4 border-t border-border py-8 xl:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] xl:gap-10"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              danger ? 'bg-danger/10 text-danger' : 'bg-accent-muted text-accent',
            )}
            aria-hidden="true"
          >
            <Icon className="size-4" />
          </span>
          <h2 id={`${id}-title`} className={cn('text-base font-semibold tracking-tight', danger && 'text-danger')}>
            {title}
          </h2>
          {preview && <Badge tone="neutral">Preview</Badge>}
        </div>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
      <Card className={cn('min-w-0 sm:p-6', danger && 'border-danger/30')}>{children}</Card>
    </section>
  )
})

// A one-line explanation for settings that aren't connected to the server yet.
export function PreviewNote({ children }) {
  return <p className="text-xs text-subtle">{children}</p>
}
