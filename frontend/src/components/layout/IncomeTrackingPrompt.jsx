import { INCOME_TRACKING_OPTIONS } from '../../utils/constants'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { cn } from '../../utils/cn'
import { useState } from 'react'

export function IncomeTrackingPrompt({ onSave }) {
  const [choice, setChoice] = useState('')
  const [budget, setBudget] = useState('')

  return (
    <Card className="mb-6 border-accent/30">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Financial profile</p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight">Do you currently track income?</h2>
      <p className="mt-1 text-sm text-muted">This only changes how your dashboard is presented. You can add income later.</p>
      <div className="mt-4 grid gap-2">
        {INCOME_TRACKING_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setChoice(option.value)}
            className={cn(
              'rounded-xl border px-4 py-3 text-left',
              choice === option.value ? 'border-accent bg-accent-muted' : 'border-border hover:bg-hover',
            )}
          >
            <p className="text-sm font-medium">{option.label}</p>
            <p className="text-xs text-muted">{option.description}</p>
          </button>
        ))}
      </div>
      {choice === 'none' && (
        <div className="mt-4">
          <Input
            type="number"
            label="Optional monthly budget"
            hint="Used to show remaining funds. Leave blank to use account balances."
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
        </div>
      )}
      <Button
        className="mt-4"
        disabled={!choice}
        onClick={() =>
          onSave({
            incomeTracking: choice,
            monthlyBudget: budget ? Number(budget) : null,
          })
        }
      >
        Save and continue
      </Button>
    </Card>
  )
}
