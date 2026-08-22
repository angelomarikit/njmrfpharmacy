import { cn } from '@/utils/cn'
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/types/database'

const statusStyles: Record<OrderStatus, string> = {
  awaiting_payment: 'bg-amber-100 text-amber-900',
  payment_submitted: 'bg-sky-100 text-sky-900',
  paid: 'bg-emerald-100 text-emerald-900',
  packing: 'bg-teal-100 text-teal-900',
  shipped: 'bg-indigo-100 text-indigo-900',
  delivered: 'bg-green-100 text-green-900',
  cancelled: 'bg-stone-200 text-stone-700',
  rejected: 'bg-red-100 text-red-800',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', statusStyles[status])}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}

export function Badge({
  children,
  tone = 'muted',
}: {
  children: string
  tone?: 'muted' | 'teal' | 'gold' | 'red'
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
        tone === 'muted' && 'bg-paper-2 text-muted',
        tone === 'teal' && 'bg-forest/10 text-forest',
        tone === 'gold' && 'bg-gold/20 text-ink',
        tone === 'red' && 'bg-red-100 text-red-800',
      )}
    >
      {children}
    </span>
  )
}
