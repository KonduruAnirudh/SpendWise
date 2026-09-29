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
import { authService } from '../../services/authService'
import { CURRENCIES, DATE_FORMATS, INCOME_TRACKING_OPTIONS } from '../../utils/constants'

export function SettingsPage() {
  const { user, updateUser, logout } = useAuth()
  const { preference, setPreference } = useTheme()
  const { push } = useToast()
  const accounts = useAsync(() => accountService.list(), [])
  const categories = useAsync(() => categoryService.list(), [])
  const [prefs, setPrefs] = useState({
    currency: user?.currency || 'INR',
    dateFormat: user?.dateFormat || 'dd MMM',
    defaultAccountId: user?.defaultAccountId || '',
    defaultCategoryId: user?.defaultCategoryId || '',
    incomeTracking: user?.incomeTracking || '',
    monthlyBudget: user?.monthlyBudget || '',
  })
  const [passwords, setPasswords] = useState({ current: '', next: '' })

  return (
    <div>
      <PageHeader eyebrow="Account" title="Settings" description="Preferences, appearance, and security." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Preferences" />
          <div className="space-y-4">
            <Select value={prefs.currency} onChange={(event) => setPrefs({ ...prefs, currency: event.target.value })} label="Currency">
              {CURRENCIES.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </Select>
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
            {user?.authProvider === 'auth0' ? (
              <p className="text-sm text-muted">
                Password and identity are managed in Auth0 for this account.
              </p>
            ) : (
              <>
                <Input
                  label="Current password"
                  type="password"
                  value={passwords.current}
                  onChange={(event) => setPasswords({ ...passwords, current: event.target.value })}
                />
                <Input
                  label="New password"
                  type="password"
                  value={passwords.next}
                  onChange={(event) => setPasswords({ ...passwords, next: event.target.value })}
                />
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!passwords.current || !passwords.next) {
                      push('Enter your current and new password.', 'error')
                      return
                    }
                    try {
                      await authService.changePassword(passwords.current, passwords.next)
                      push('Password updated.')
                      setPasswords({ current: '', next: '' })
                    } catch (error) {
                      push(error.message, 'error')
                    }
                  }}
                >
                  Change password
                </Button>
              </>
            )}
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
