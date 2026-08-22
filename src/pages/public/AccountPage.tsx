import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { storeImages } from '@/data/images'
import { fetchOrders } from '@/services/orderService'
import { formatDateTime, formatPeso } from '@/utils/format'
import type { OrderWithRelations } from '@/types/database'

export default function AccountPage() {
  const { siteId } = useSite()
  const { customer, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!siteId || !customer) return
    let cancelled = false
    void fetchOrders(siteId, { customerId: customer.id })
      .then((next) => {
        if (!cancelled) setOrders(next)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [siteId, customer])

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <section className="overflow-hidden rounded-[2rem] border border-line bg-card shadow-sm">
        <div className="relative h-40">
          <img src={storeImages.hero} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-forest/45" />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-6">
          <div>
            <p className="section-kicker">Your pharmacy account</p>
            <h1 className="mt-2 font-display text-4xl">{customer?.full_name}</h1>
            <p className="mt-1 text-sm text-muted">{user?.email}</p>
            {customer?.phone ? <p className="text-sm text-muted">{customer.phone}</p> : null}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              void signOut().then(() => navigate('/'))
            }}
          >
            Sign out
          </Button>
        </div>
      </section>

      <h2 className="mt-10 font-display text-3xl">Orders</h2>
      {loading ? (
        <PageLoader label="Loading orders…" />
      ) : orders.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No orders yet"
            description="When you checkout, your receipts and J&T tracking will live here."
            action={
              <Link to="/products">
                <Button>Start shopping</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="surface-card rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-sm text-muted">{formatDateTime(order.created_at)}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-forest">{formatPeso(order.total)}</p>
                {order.status === 'awaiting_payment' || order.status === 'payment_submitted' ? (
                  <Link to={`/orders/${order.id}/pay`} className="text-sm text-forest hover:underline">
                    {order.status === 'awaiting_payment' ? 'Pay now' : 'View payment'}
                  </Link>
                ) : null}
              </div>
              {order.tracking_number ? (
                <p className="mt-2 text-sm text-muted">J&T tracking: {order.tracking_number}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
