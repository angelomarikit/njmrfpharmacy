import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { chargeableWeightGrams, lookupDeliveryFee } from '@/services/deliveryService'
import { placeOrder } from '@/services/orderService'
import { fetchStoreSettings } from '@/services/storeService'
import { formatPeso } from '@/utils/format'
import { toUserMessage } from '@/lib/errors'
import { REGION_OPTIONS, type DeliveryRegion, type FulfillmentType, type StoreSettings } from '@/types/database'

export default function CheckoutPage() {
  const { siteId } = useSite()
  const { customer } = useAuth()
  const { lines, subtotal, refresh } = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery')
  const [recipientName, setRecipientName] = useState(customer?.full_name ?? '')
  const [recipientPhone, setRecipientPhone] = useState(customer?.phone ?? '')
  const [street, setStreet] = useState('')
  const [barangay, setBarangay] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [region, setRegion] = useState<DeliveryRegion>('metro_manila')
  const [notes, setNotes] = useState('')
  const [deliveryFee, setDeliveryFee] = useState<number | null>(0)
  const [submitting, setSubmitting] = useState(false)
  const [feeError, setFeeError] = useState<string | null>(null)

  useEffect(() => {
    if (!siteId) return
    void fetchStoreSettings(siteId).then((next) => {
      setSettings(next)
      if (next && !next.delivery_enabled && next.pickup_enabled) {
        setFulfillment('pickup')
      }
    })
  }, [siteId])

  const weight = useMemo(() => {
    return lines.reduce((sum, line) => {
      const unit = chargeableWeightGrams(
        line.product.weight_grams,
        line.product.length_cm,
        line.product.width_cm,
        line.product.height_cm,
        settings?.volumetric_divisor ?? 3500,
      )
      return sum + unit * line.quantity
    }, 0)
  }, [lines, settings?.volumetric_divisor])

  useEffect(() => {
    if (!siteId || fulfillment !== 'delivery') {
      setDeliveryFee(0)
      setFeeError(null)
      return
    }

    let cancelled = false
    void lookupDeliveryFee(siteId, region, weight)
      .then((fee) => {
        if (cancelled) return
        setDeliveryFee(fee)
        setFeeError(fee == null ? 'No J&T rate found for this destination and weight. Please call the pharmacy.' : null)
      })
      .catch((error) => {
        if (!cancelled) setFeeError(toUserMessage(error, 'Unable to calculate delivery.'))
      })

    return () => {
      cancelled = true
    }
  }, [siteId, fulfillment, region, weight])

  const total = subtotal + (fulfillment === 'delivery' ? (deliveryFee ?? 0) : 0)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!siteId) return
    if (fulfillment === 'delivery' && deliveryFee == null) return
    setSubmitting(true)
    try {
      const order = await placeOrder({
        siteId,
        fulfillmentType: fulfillment,
        recipientName,
        recipientPhone,
        street: fulfillment === 'delivery' ? street : null,
        barangay: fulfillment === 'delivery' ? barangay : null,
        city: fulfillment === 'delivery' ? city : null,
        province: fulfillment === 'delivery' ? province : null,
        postalCode: fulfillment === 'delivery' ? postalCode : null,
        region: fulfillment === 'delivery' ? region : null,
        customerNotes: notes,
      })
      await refresh()
      toast.success('Order placed. Please send payment.')
      navigate(`/orders/${order.id}/pay`)
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to place this order.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (lines.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl">Nothing to checkout</h1>
        <Link to="/products" className="mt-4 inline-block text-forest hover:underline">
          Shop products
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr]">
      <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
        <h1 className="font-display text-4xl">Checkout</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          {settings?.delivery_enabled !== false ? (
            <label className="rounded-2xl border border-line bg-white p-4">
              <input
                type="radio"
                name="fulfillment"
                checked={fulfillment === 'delivery'}
                onChange={() => setFulfillment('delivery')}
              />
              <span className="ml-2 font-medium">J&T Express delivery</span>
            </label>
          ) : null}
          {settings?.pickup_enabled !== false ? (
            <label className="rounded-2xl border border-line bg-white p-4">
              <input
                type="radio"
                name="fulfillment"
                checked={fulfillment === 'pickup'}
                onChange={() => setFulfillment('pickup')}
              />
              <span className="ml-2 font-medium">Store pickup</span>
            </label>
          ) : null}
        </div>
        <Input label="Recipient name" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} required />
        <Input label="Phone" value={recipientPhone} onChange={(event) => setRecipientPhone(event.target.value)} required />
        {fulfillment === 'delivery' ? (
          <>
            <Input label="Street / house" value={street} onChange={(event) => setStreet(event.target.value)} required />
            <Input label="Barangay" value={barangay} onChange={(event) => setBarangay(event.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="City" value={city} onChange={(event) => setCity(event.target.value)} required />
              <Input label="Province" value={province} onChange={(event) => setProvince(event.target.value)} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Postal code" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} />
              <Select
                label="Region"
                value={region}
                onChange={(event) => setRegion(event.target.value as DeliveryRegion)}
              >
                {REGION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </>
        ) : null}
        <Textarea label="Order notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        {feeError ? <p className="text-sm text-red-700">{feeError}</p> : null}
        <Button type="submit" disabled={submitting || Boolean(feeError)} className="w-full">
          {submitting ? 'Placing order…' : `Place order · ${formatPeso(total)}`}
        </Button>
      </form>

      <aside className="surface-card rounded-[2rem] p-5">
        <h2 className="font-display text-2xl">Summary</h2>
        <div className="mt-4 space-y-3">
          {lines.map((line) => (
            <div key={line.product.id} className="flex justify-between gap-3 text-sm">
              <span>
                {line.product.title} × {line.quantity}
              </span>
              <span>{formatPeso(Number(line.product.price) * line.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPeso(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery {fulfillment === 'delivery' ? `(${weight} g)` : ''}</span>
            <span>{fulfillment === 'pickup' ? formatPeso(0) : formatPeso(deliveryFee ?? 0)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="text-forest">{formatPeso(total)}</span>
          </div>
        </div>
      </aside>
    </main>
  )
}
