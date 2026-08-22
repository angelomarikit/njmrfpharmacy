import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageLoader } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/Badge'
import { useSite } from '@/contexts/SiteContext'
import { fetchOrders } from '@/services/orderService'
import { formatDateTime, formatPeso } from '@/utils/format'
import { ORDER_STATUS_LABELS, type OrderStatus, type OrderWithRelations } from '@/types/database'

export default function OrdersPage() {
  const { siteId } = useSite()
  const [orders, setOrders] = useState<OrderWithRelations[]>([])
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!siteId) return
    let cancelled = false
    setLoading(true)
    void fetchOrders(siteId, { status, query })
      .then((next) => {
        if (!cancelled) setOrders(next)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [siteId, status, query])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-forest uppercase">Sales</p>
        <h1 className="font-display text-3xl">Orders</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <Input label="Search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order number, name, phone" />
        <Select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus | 'all')}
        >
          <option value="all">All statuses</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      {loading ? (
        <PageLoader label="Loading orders…" />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders found" />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/admin/orders/${order.id}`}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-paper"
            >
              <div>
                <p className="font-medium">{order.order_number}</p>
                <p className="text-sm text-muted">
                  {order.recipient_name} · {formatDateTime(order.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatPeso(order.total)}</p>
                <StatusBadge status={order.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
