import { useState } from 'react'
import { KeyRound, LogOut, ShieldCheck } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { ChangePasswordModal } from './ChangePasswordModal'
import { ProfileSection } from './ProfileSection'

export function SecuritySettings({ email, onLogout }) {
  const [changingPassword, setChangingPassword] = useState(false)

  return (
    <ProfileSection
      id="security"
      icon={ShieldCheck}
      title="Security"
      description="Your password and this device's session."
    >
      <ul className="divide-y divide-border">
        <SettingRow
          icon={KeyRound}
          title="Password"
          detail="Change it with your current password. You stay signed in on this device."
          action={
            <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)}>
              Change password
            </Button>
          }
        />
        <SettingRow
          icon={LogOut}
          title="Sign out"
          detail={
            <>
              Signed in as <span className="break-all text-fg">{email}</span> on this device.
            </>
          }
          action={
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="size-3.5" aria-hidden="true" /> Log out
            </Button>
          }
        />
      </ul>
      <ChangePasswordModal open={changingPassword} onClose={() => setChangingPassword(false)} />
    </ProfileSection>
  )
}

function SettingRow({ icon: Icon, title, detail, action }) {
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-0.5 text-sm text-muted">{detail}</p>
        </div>
      </div>
      <div className="shrink-0 pl-7 sm:pl-0">{action}</div>
    </li>
  )
}
