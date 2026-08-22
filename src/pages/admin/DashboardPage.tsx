import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageLoader } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/Badge'
import { useSite } from '@/contexts/SiteContext'
import { storeImages } from '@/data/images'
import { fetchOrders, fetchSalesSummary } from '@/services/orderService'
import { fetchProducts } from '@/services/productService'
import { CountUp } from '@/components/CountUp'
import { formatDateTime, formatPeso, startOfDay, startOfMonth, startOfWeek, toIso } from '@/utils/format'
import type { OrderWithRelations, ProductWithRelations } from '@/types/database'

interface SummaryCard {
  label: string
  total: number
  orders: number
}

export default function DashboardPage() {
  const { siteId } = useSite()
  const [cards, setCards] = useState<SummaryCard[]>([])
  const [pending, setPending] = useState<OrderWithRelations[]>([])
  const [lowStock, setLowStock] = useState<ProductWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentSiteId = siteId
    if (!currentSiteId) return
    let cancelled = false

    async function load(id: string) {
      setLoading(true)
      try {
        const now = new Date()
        const [today, week, month, orders, products] = await Promise.all([
          fetchSalesSummary(id, toIso(startOfDay(now)), toIso(now)),
          fetchSalesSummary(id, toIso(startOfWeek(now)), toIso(now)),
          fetchSalesSummary(id, toIso(startOfMonth(now)), toIso(now)),
          fetchOrders(id, { status: 'payment_submitted' }),
          fetchProducts(id, { lowStockOnly: true }),
        ])
        if (cancelled) return
        setCards([
          { label: 'Today', total: today.total_sales, orders: today.order_count },
          { label: 'This week', total: week.total_sales, orders: week.order_count },
          { label: 'This month', total: month.total_sales, orders: month.order_count },
        ])
        setPending(orders.slice(0, 6))
        setLowStock(products.slice(0, 8))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(currentSiteId)
    return () => {
      cancelled = true
    }
  }, [siteId])

  if (loading) return <PageLoader label="Loading dashboard…" />

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-line bg-card shadow-sm">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 sm:p-8">
            <p className="section-kicker">Good day, pharmacist</p>
            <h1 className="mt-2 font-display text-4xl">The desk is ready.</h1>
            <p className="mt-3 max-w-lg text-muted">
              Verify QR payments, watch low stock, and keep J&T parcels moving for Messiah Sanare Pharmacy.
            </p>
          </div>
          <img src={storeImages.shelves} alt="" className="h-44 w-full object-cover lg:h-full" />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="surface-card rounded-3xl p-5">
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 font-display text-3xl text-forest">
              <CountUp value={card.total} format={(value) => formatPeso(value)} />
            </p>
            <p className="mt-1 text-sm text-muted">
              <CountUp value={card.orders} /> paid orders
            </p>
          </div>
        ))}
      </div>

      <section className="surface-card rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Payments to verify</h2>
          <Link to="/admin/orders" className="text-sm text-forest hover:underline">
            All orders
          </Link>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">No payment screenshots waiting.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((order) => (
              <Link
                key={order.id}
                to={`/admin/orders/${order.id}`}
                className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3 hover:bg-paper-2"
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
      </section>

      <section className="surface-card rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Low stock</h2>
          <Link to="/admin/products" className="text-sm text-forest hover:underline">
            Products
          </Link>
        </div>
        {lowStock.length === 0 ? (
          <p className="text-sm text-muted">All products are above their stock threshold.</p>
        ) : (
          <div className="space-y-2">
            {lowStock.map((product) => (
              <Link
                key={product.id}
                to={`/admin/products/${product.id}`}
                className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3 hover:bg-paper-2"
              >
                <p className="font-medium">{product.title}</p>
                <p className="text-sm text-red-700">{product.stock_quantity} left</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
