import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { PageLoader } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/Badge'
import { useToast } from '@/contexts/ToastContext'
import { fetchOrderById, setOrderStatus } from '@/services/orderService'
import { getProofSignedUrl } from '@/services/storageService'
import { formatDateTime, formatPeso } from '@/utils/format'
import { toUserMessage } from '@/lib/errors'
import { REGION_OPTIONS, type OrderStatus, type OrderWithRelations } from '@/types/database'

const nextActions: Partial<Record<OrderStatus, OrderStatus[]>> = {
  awaiting_payment: ['cancelled'],
  payment_submitted: ['paid', 'rejected'],
  paid: ['packing', 'cancelled'],
  packing: ['shipped'],
  shipped: ['delivered'],
}

export default function OrderDetailPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const [order, setOrder] = useState<OrderWithRelations | null>(null)
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [tracking, setTracking] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    const next = await fetchOrderById(id)
    setOrder(next)
    setTracking(next.tracking_number ?? '')
    setNotes(next.admin_notes ?? '')
    setProofUrl(await getProofSignedUrl(next.payment_proof_url))
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void load()
      .catch((error) => {
        if (!cancelled) toast.error(toUserMessage(error, 'Unable to load this order.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function updateStatus(status: OrderStatus) {
    if (!order) return
    setSaving(true)
    try {
      await setOrderStatus(order.id, status, tracking, notes)
      await load()
      toast.success('Order updated')
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to update this order.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading || !order) return <PageLoader label="Loading order…" />

  const regionLabel = REGION_OPTIONS.find((item) => item.value === order.region)?.label
  const actions = nextActions[order.status] ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to="/admin/orders" className="text-sm text-forest hover:underline">
          Back to orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl">{order.order_number}</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-muted">{formatDateTime(order.created_at)}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-display text-xl">Customer</h2>
          <p className="mt-2 font-medium">{order.recipient_name}</p>
          <p className="text-sm text-muted">{order.recipient_phone}</p>
          {order.customer_profiles?.full_name ? (
            <p className="mt-1 text-sm text-muted">Account: {order.customer_profiles.full_name}</p>
          ) : null}
          {order.fulfillment_type === 'delivery' ? (
            <p className="mt-3 text-sm">
              {order.street}
              {order.barangay ? `, ${order.barangay}` : ''}
              <br />
              {order.city}, {order.province} {order.postal_code}
              <br />
              {regionLabel}
            </p>
          ) : (
            <p className="mt-3 text-sm">Store pickup</p>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-display text-xl">Totals</h2>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPeso(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{formatPeso(order.delivery_fee)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total to verify</span>
              <span className="text-forest">{formatPeso(order.total)}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-xl">Items</h2>
        <div className="mt-3 space-y-2">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex justify-between gap-3 text-sm">
              <span>
                {item.title} × {item.quantity}
              </span>
              <span>{formatPeso(item.line_total)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-xl">Payment screenshot</h2>
        {proofUrl ? (
          <img src={proofUrl} alt="Payment screenshot" className="mt-4 max-h-96 rounded-xl object-contain" />
        ) : (
          <p className="mt-3 text-sm text-muted">No screenshot uploaded yet.</p>
        )}
        {order.payment_reference ? <p className="mt-2 text-sm">Reference: {order.payment_reference}</p> : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-xl">Update order</h2>
        <Input label="J&T tracking number" value={tracking} onChange={(event) => setTracking(event.target.value)} />
        <Textarea label="Admin notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        <div className="flex flex-wrap gap-2">
          {actions.map((status) => (
            <Button
              key={status}
              variant={status === 'rejected' || status === 'cancelled' ? 'danger' : 'primary'}
              disabled={saving}
              onClick={() => void updateStatus(status)}
            >
              Mark as {status.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-xl">Timeline</h2>
        <div className="mt-3 space-y-2 text-sm">
          {order.order_events.map((event) => (
            <div key={event.id}>
              <p className="font-medium">{event.event_type}</p>
              <p className="text-muted">
                {formatDateTime(event.created_at)}
                {event.note ? ` · ${event.note}` : ''}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
