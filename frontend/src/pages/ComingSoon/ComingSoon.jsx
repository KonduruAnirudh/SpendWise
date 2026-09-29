import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

// Shown for features that have no backend yet, so a bookmarked URL never shows fake data.
export function ComingSoonPage({ title, description, alternative, to, linkLabel }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card className="max-w-xl">
        <Badge tone="accent">Coming soon</Badge>
        <p className="mt-4 text-sm text-muted">{description}</p>
        {alternative && <p className="mt-2 text-sm text-muted">{alternative}</p>}
        {to && (
          <Link to={to} className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
            {linkLabel} →
          </Link>
        )}
      </Card>
    </div>
  )
}

// The same message inside the sign-in layout (no sidebar).
export function AuthComingSoon({ description, to = '/login', linkLabel = 'Back to sign in' }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <Badge tone="accent">Coming soon</Badge>
      <p className="text-sm text-muted">{description}</p>
      <Link to={to} className="inline-block text-sm font-medium text-accent hover:underline">
        {linkLabel}
      </Link>
    </div>
  )
}
