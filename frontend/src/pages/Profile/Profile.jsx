import { useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'

export function ProfilePage() {
  const { user, updateUser } = useAuth()
  const { push } = useToast()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')

  return (
    <div>
      <PageHeader eyebrow="Account" title="Profile" description="How you appear across SpendWise." />
      <Card className="max-w-xl">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={name || user?.name} className="size-16 text-lg" />
          <div>
            <p className="font-medium">{name}</p>
            <p className="text-sm text-muted">Profile picture is generated from your initials for now.</p>
          </div>
        </div>
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Button
            onClick={async () => {
              const next = await authService.updateProfile({ name, email })
              updateUser(next)
              push('Profile updated.')
            }}
          >
            Save profile
          </Button>
        </div>
      </Card>
    </div>
  )
}
