import { PageHeader } from '../../components/layout/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { accountService } from '../../services/accountService'
import { profileService } from '../../services/profileService'
import { AppearanceSettings } from '../../features/settings/components/AppearanceSettings'
import { PreferenceSettings } from '../../features/settings/components/PreferenceSettings'
import { SecuritySettings } from '../../features/profile/components/SecuritySettings'

export function SettingsPage() {
  const { user, updateUser, logout } = useAuth()
  const preferences = useAsync(() => profileService.getPreferences(), [])
  const accounts = useAsync(() => accountService.list(), [])

  // Preferences are mirrored onto the signed-in user, which the Dashboard and Transactions read.
  function handlePreferencesSaved(saved) {
    updateUser(saved)
    preferences.refetch()
  }

  return (
    <div className="pb-4">
      <PageHeader eyebrow="Account" title="Settings" description="Preferences, appearance and security." />
      <PreferenceSettings
        currency={user?.currency || 'INR'}
        preferences={preferences}
        accounts={accounts}
        onSaved={handlePreferencesSaved}
      />
      <AppearanceSettings />
      <SecuritySettings email={user?.email} onLogout={logout} />
    </div>
  )
}
