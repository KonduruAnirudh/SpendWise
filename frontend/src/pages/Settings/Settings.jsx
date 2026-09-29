import { useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { accountService } from '../../services/accountService'
import { categoryService } from '../../services/categoryService'
import { Badge } from '../../components/ui/Badge'
import { DATE_FORMATS, INCOME_TRACKING_OPTIONS } from '../../utils/constants'

export function SettingsPage() {
  const { user, updateUser, logout } = useAuth()
  const { preference, setPreference } = useTheme()
  const { push } = useToast()
  const accounts = useAsync(() => accountService.list(), [])
  const categories = useAsync(() => categoryService.list(), [])
  const [prefs, setPrefs] = useState({
    dateFormat: user?.dateFormat || 'dd MMM',
    defaultAccountId: user?.defaultAccountId || '',
    defaultCategoryId: user?.defaultCategoryId || '',
    incomeTracking: user?.incomeTracking || '',
    monthlyBudget: user?.monthlyBudget || '',
  })

  return (
    <div>
      <PageHeader eyebrow="Account" title="Settings" description="Preferences, appearance, and security." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Preferences" description="Saved in this browser." />
          <div className="space-y-4">
            <Input
              label="Currency"
              value={user?.currency || 'INR'}
              disabled
              hint="Set when your account was created. Changing it isn't available yet."
            />
            <Select value={prefs.dateFormat} onChange={(event) => setPrefs({ ...prefs, dateFormat: event.target.value })} label="Date format">
              {DATE_FORMATS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Select
              label="Default account"
              value={prefs.defaultAccountId}
              onChange={(event) => setPrefs({ ...prefs, defaultAccountId: event.target.value })}
            >
              <option value="">None</option>
              {(accounts.data || []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
            <Select
              label="Default category"
              value={prefs.defaultCategoryId}
              onChange={(event) => setPrefs({ ...prefs, defaultCategoryId: event.target.value })}
            >
              <option value="">None</option>
              {(categories.data || []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select
              label="Do you currently track income?"
              value={prefs.incomeTracking || ''}
              onChange={(event) => setPrefs({ ...prefs, incomeTracking: event.target.value })}
            >
              <option value="">Not set</option>
              {INCOME_TRACKING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {prefs.incomeTracking === 'none' && (
              <Input
                type="number"
                label="Monthly budget (optional)"
                value={prefs.monthlyBudget || ''}
                onChange={(event) => setPrefs({ ...prefs, monthlyBudget: event.target.value ? Number(event.target.value) : null })}
              />
            )}
            <Button
              onClick={() => {
                updateUser(prefs)
                push('Preferences saved.')
              }}
            >
              Save preferences
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Appearance" />
          <div className="grid grid-cols-3 gap-2">
            {['light', 'dark', 'system'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPreference(option)}
                className={`rounded-xl border px-3 py-4 text-sm capitalize ${
                  preference === option ? 'border-accent bg-accent-muted text-accent' : 'border-border hover:bg-hover'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Security" />
          <div className="space-y-4">
            <div className="space-y-3">
              <Input label="Current password" type="password" value="" disabled />
              <Input label="New password" type="password" value="" disabled />
              <div className="flex items-center gap-2 text-sm text-muted">
                <Badge tone="accent">Coming soon</Badge>
                Changing your password isn't available yet.
              </div>
            </div>
            <div className="rounded-xl border border-border p-3 text-sm">
              <p className="font-medium">Sessions</p>
              <p className="mt-1 text-muted">This browser · Active now</p>
            </div>
            <Button variant="danger" onClick={logout}>
              Logout
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
