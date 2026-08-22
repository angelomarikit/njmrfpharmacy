import { cn } from '@/utils/cn'

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-forest text-white',
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    </span>
  )
}
