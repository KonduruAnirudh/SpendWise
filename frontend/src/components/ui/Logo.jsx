import { cn } from '../../utils/cn'

export function Logo({ className, compact = false }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoMark className="size-8 shrink-0" />
      {!compact && (
        <div className="leading-tight">
          <p className="font-semibold tracking-tight text-fg">SpendWise</p>
        </div>
      )}
    </div>
  )
}

export function LogoMark({ className }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-accent/15 dark:fill-accent/10" />
      <rect x="1" y="1" width="30" height="30" rx="7" className="stroke-accent" strokeWidth="1.4" />
      <path
        d="M21.6 9.4C18.2 7.6 11.6 8.4 11.4 13c-.2 3.8 8.4 2.4 8.4 6.6 0 3.6-6.2 4.6-10 2.6"
        className="stroke-accent"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <circle cx="21.7" cy="9.3" r="1.65" className="fill-fg" />
      <path
        d="M8.2 22.6h1.9v-3H8.2zm2.7 0h1.9v-4.8h-1.9zm2.7 0h1.9V14.9h-1.9z"
        className="fill-accent"
      />
    </svg>
  )
}
