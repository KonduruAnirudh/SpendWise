import { useRef, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { ErrorState } from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { accountService } from '../../services/accountService'
import { profileService } from '../../services/profileService'
import { ProfileHeader } from '../../features/profile/components/ProfileHeader'
import { PersonalInformation } from '../../features/profile/components/PersonalInformation'
import { FinancialPreferences } from '../../features/profile/components/FinancialPreferences'
import { SecuritySettings } from '../../features/profile/components/SecuritySettings'
import { AIAssistantPreferences } from '../../features/profile/components/AIAssistantPreferences'
import { DangerZone } from '../../features/profile/components/DangerZone'
import { ProfileSkeleton } from '../../features/profile/components/ProfileSkeleton'

export function ProfilePage() {
  const { user, updateUser, logout } = useAuth()
  const { push } = useToast()
  // Each part loads on its own, so a slow or failing section doesn't block the rest of the page.
  const profile = useAsync(() => profileService.getProfile(), [])
  const preferences = useAsync(() => profileService.getPreferences(), [])
  const accounts = useAsync(() => accountService.list(), [])
  const [editingPersonal, setEditingPersonal] = useState(false)
  const personalRef = useRef(null)

  function editProfile() {
    setEditingPersonal(true)
    personalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // After a currency change every amount on the page is new: reload accounts and preferences too.
  function handleProfileSaved(saved, conversion) {
    updateUser({ name: saved.name, username: saved.username, currency: saved.currency })
    profile.refetch()
    if (conversion) {
      updateUser({ monthlyBudget: conversion.preferences.monthlyBudget })
      preferences.refetch()
      accounts.refetch()
    }
  }

  // Preferences are mirrored onto the signed-in user, which the Dashboard and Transactions read.
  function handlePreferencesSaved(saved) {
    updateUser(saved)
    preferences.refetch()
  }

  function handleAccountDeleted() {
    push('Your account was deleted.')
    logout()
  }

  if (profile.loading && !profile.data) {
    return (
      <div>
        <PageHeader eyebrow="Account" title="Profile" description="Manage your personal information and preferences." />
        <ProfileSkeleton />
      </div>
    )
  }

  // If the server can't be reached, fall back to the details saved with the session.
  const current = profile.data || (profile.error && user ? user : null)
  if (!current) {
    return (
      <div>
        <PageHeader eyebrow="Account" title="Profile" description="Manage your personal information and preferences." />
        <ErrorState message="We couldn't load your profile." onRetry={profile.refetch} />
      </div>
    )
  }

  return (
    <div className="pb-4">
      <PageHeader eyebrow="Account" title="Profile" description="Manage your personal information and preferences." />

      {profile.error && (
        <div
          className="mb-4 flex flex-col gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span className="text-danger">Couldn't refresh your profile. Showing the details saved on this device.</span>
          <button type="button" onClick={profile.refetch} className="font-medium text-danger underline-offset-2 hover:underline">
            Try again
          </button>
        </div>
      )}

      <ProfileHeader
        profile={current}
        accountCount={accounts.data ? accounts.data.length : null}
        onEdit={editProfile}
      />

      <div className="mt-6">
        <PersonalInformation
          ref={personalRef}
          profile={current}
          editing={editingPersonal}
          onEditingChange={setEditingPersonal}
          onSaved={handleProfileSaved}
        />
        <FinancialPreferences
          currency={current.currency || 'INR'}
          preferences={preferences}
          accounts={accounts}
          onSaved={handlePreferencesSaved}
        />
        <SecuritySettings email={current.email} onLogout={logout} />
        <AIAssistantPreferences preferences={preferences} onSaved={handlePreferencesSaved} />
        <DangerZone onDeleted={handleAccountDeleted} />
      </div>
    </div>
  )
}
