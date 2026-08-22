import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchOrderById, submitPaymentProof } from '@/services/orderService'
import { fetchStoreSettings } from '@/services/storeService'
import { getProofSignedUrl, uploadPaymentProof } from '@/services/storageService'
import { formatPeso } from '@/utils/format'
import { toUserMessage } from '@/lib/errors'
import type { OrderWithRelations, StoreSettings } from '@/types/database'

export default function PayPage() {
  const { id = '' } = useParams()
  const { siteId } = useSite()
  const { user } = useAuth()
  const toast = useToast()
  const [order, setOrder] = useState<OrderWithRelations | null>(null)
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [reference, setReference] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const currentSiteId = siteId
    if (!currentSiteId || !id) return
    let cancelled = false

    async function load(currentId: string, orderId: string) {
      setLoading(true)
      try {
        const [nextOrder, nextSettings] = await Promise.all([
          fetchOrderById(orderId),
          fetchStoreSettings(currentId),
        ])
        if (cancelled) return
        setOrder(nextOrder)
        setSettings(nextSettings)
        setProofUrl(await getProofSignedUrl(nextOrder.payment_proof_url))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(currentSiteId, id)
    return () => {
      cancelled = true
    }
  }, [id, siteId])

  if (loading) return <PageLoader label="Loading payment…" />
  if (!order) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl">Order not found</h1>
      </main>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user || !siteId || !file || !order) {
      toast.error('Please attach a payment screenshot.')
      return
    }
    setSubmitting(true)
    try {
      const path = await uploadPaymentProof(siteId, user.id, order.id, file)
      const updated = await submitPaymentProof(order.id, path, reference)
      setOrder({
        ...order,
        ...updated,
        order_items: order.order_items,
        order_events: order.order_events,
      })
      setProofUrl(await getProofSignedUrl(path))
      toast.success('Screenshot submitted. We will verify your payment.')
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to submit the screenshot.'))
    } finally {
      setSubmitting(false)
    }
  }

  const waiting = order.status === 'awaiting_payment'

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs tracking-[0.18em] text-forest uppercase">Payment</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl">{order.order_number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-3 text-2xl font-semibold text-forest">Pay exactly {formatPeso(order.total)}</p>
      <p className="mt-1 text-sm text-muted">
        {order.fulfillment_type === 'delivery'
          ? `Includes ${formatPeso(order.delivery_fee)} J&T delivery`
          : 'Store pickup · no delivery fee'}
      </p>

      <div className="mt-8 grid gap-6 rounded-[2rem] border border-line bg-card p-5 sm:grid-cols-2">
        <div>
          {settings?.payment_qr_url ? (
            <img
              src={settings.payment_qr_url}
              alt="Payment QR"
              className="mx-auto max-h-72 rounded-2xl border border-line object-contain"
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl bg-paper-2 text-sm text-muted">
              Payment QR is not set up yet.
            </div>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-muted">Method</span>
            <br />
            {(settings?.payment_provider ?? 'gcash').toUpperCase()}
          </p>
          {settings?.payment_account_name ? (
            <p>
              <span className="text-muted">Account name</span>
              <br />
              {settings.payment_account_name}
            </p>
          ) : null}
          {settings?.payment_account_number ? (
            <p>
              <span className="text-muted">Account number</span>
              <br />
              {settings.payment_account_number}
            </p>
          ) : null}
          {settings?.payment_instructions ? (
            <p className="whitespace-pre-wrap text-muted">{settings.payment_instructions}</p>
          ) : (
            <p className="text-muted">Send the exact total, then upload a clear screenshot.</p>
          )}
        </div>
      </div>

      {waiting ? (
        <form className="mt-8 space-y-4 rounded-[2rem] border border-line bg-card p-5" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <p className="text-sm font-medium">Payment screenshot</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="h-4 w-4" />
              {file ? 'Change file' : 'Choose file'}
            </Button>
            <p className="text-sm text-muted">{file ? file.name : 'JPG, PNG, or WebP. No file chosen yet.'}</p>
          </div>
          <Input
            label="Reference number (optional)"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Uploading…' : 'Submit payment screenshot'}
          </Button>
        </form>
      ) : (
        <div className="mt-8 rounded-[2rem] border border-line bg-card p-5">
          <p className="font-medium">Payment screenshot received.</p>
          {proofUrl ? <img src={proofUrl} alt="Payment screenshot" className="mt-4 max-h-80 rounded-xl object-contain" /> : null}
        </div>
      )}

      <Link to="/account" className="mt-6 inline-block text-sm text-forest hover:underline">
        View my orders
      </Link>
    </main>
  )
}
