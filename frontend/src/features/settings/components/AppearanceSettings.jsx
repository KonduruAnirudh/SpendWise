import { Monitor, Moon, Palette, Sun } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { cn } from '../../../utils/cn'
import { ProfileSection } from '../../profile/components/ProfileSection'

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Warm paper tones.' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes at night.' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follows your device.' },
]

// Applies instantly; the choice is remembered on this device.
export function AppearanceSettings() {
  const { preference, setPreference, resolved } = useTheme()
  return (
    <ProfileSection id="appearance" icon={Palette} title="Appearance" description="Choose how SpendWise looks on this device.">
      <div role="radiogroup" aria-label="Theme" className="grid gap-2 sm:grid-cols-3">
        {THEMES.map((theme) => {
          const selected = preference === theme.value
          return (
            <button
              key={theme.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPreference(theme.value)}
              className={cn(
                'flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                selected ? 'border-accent bg-accent-muted' : 'border-border hover:bg-hover',
              )}
            >
              <theme.icon className={cn('mt-0.5 size-4 shrink-0', selected ? 'text-accent' : 'text-muted')} aria-hidden="true" />
              <span>
                <span className={cn('block text-sm font-medium', selected ? 'text-accent' : 'text-fg')}>{theme.label}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {theme.value === 'system' && selected ? `Currently ${resolved}.` : theme.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </ProfileSection>
  )
}
