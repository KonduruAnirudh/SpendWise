import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { DeleteAccountModal } from './DeleteAccountModal'
import { ProfileSection } from './ProfileSection'

export function DangerZone({ onDeleted }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <ProfileSection
      id="danger-zone"
      icon={TriangleAlert}
      title="Danger zone"
      description="Actions that can't be undone."
      tone="danger"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">Delete account</p>
          <p className="mt-0.5 text-sm text-muted">Delete your SpendWise account and the financial data in it.</p>
        </div>
        <Button
          variant="outline"
          className="shrink-0 border-danger/40 text-danger hover:bg-danger/10"
          onClick={() => setConfirming(true)}
        >
          Delete account
        </Button>
      </div>
      <DeleteAccountModal open={confirming} onClose={() => setConfirming(false)} onDeleted={onDeleted} />
    </ProfileSection>
  )
}
