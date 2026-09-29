import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../utils/formatters'

// Read-only: the API has no profile update endpoint yet (PATCH /users/me is future work).
export function ProfilePage() {
  const { user } = useAuth()

  return (
    <div>
      <PageHeader eyebrow="Account" title="Profile" description="How you appear across SpendWise." />
      <Card className="max-w-xl">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={user?.name} className="size-16 text-lg" />
          <div>
            <p className="font-medium">{user?.name}</p>
            <p className="text-sm text-muted">Profile picture is generated from your initials.</p>
          </div>
        </div>
        <div className="space-y-4">
          <Input label="Name" value={user?.name || ''} disabled />
          <Input label="Email" type="email" value={user?.email || ''} disabled />
          <Input label="Currency" value={user?.currency || ''} disabled />
          {user?.createdAt && <p className="text-xs text-subtle">Member since {formatDate(user.createdAt, 'long')}</p>}
          <div className="flex items-center gap-2 text-sm text-muted">
            <Badge tone="accent">Coming soon</Badge>
            Editing your profile isn't available yet.
          </div>
        </div>
      </Card>
    </div>
  )
}
