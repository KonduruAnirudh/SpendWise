import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './Input'

// Input with a show/hide toggle. `label` also names the toggle for screen readers.
export function PasswordInput({ label, ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <Input
      {...props}
      label={label}
      type={visible ? 'text' : 'password'}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-fg"
          aria-label={`${visible ? 'Hide' : 'Show'} ${label?.toLowerCase() || 'password'}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  )
}
