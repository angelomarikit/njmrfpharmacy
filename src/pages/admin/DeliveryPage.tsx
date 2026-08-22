import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchDeliveryRates, updateDeliveryRate } from '@/services/deliveryService'
import { toUserMessage } from '@/lib/errors'
import { REGION_OPTIONS, type DeliveryRate } from '@/types/database'

export default function DeliveryPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [rates, setRates] = useState<DeliveryRate[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    if (!siteId) return
    void fetchDeliveryRates(siteId)
      .then((next) => {
        setRates(next)
        setDrafts(Object.fromEntries(next.map((rate) => [rate.id, String(rate.fee)])))
      })
      .finally(() => setLoading(false))
  }, [siteId])

  async function save(rate: DeliveryRate) {
    setSavingId(rate.id)
    try {
      const updated = await updateDeliveryRate(rate.id, Number(drafts[rate.id] ?? rate.fee))
      setRates((current) => current.map((item) => (item.id === rate.id ? updated : item)))
      toast.success('Rate saved')
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to save this rate.'))
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <PageLoader label="Loading J&T rates…" />

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-forest uppercase">Shipping</p>
        <h1 className="font-display text-3xl">J&T Express rates</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Seeded from published Metro Manila origin rates. Confirm with your local J&T branch and edit the
          pesos here. Checkout uses these numbers.
        </p>
      </div>
      {REGION_OPTIONS.map((region) => {
        const rows = rates.filter((rate) => rate.destination_region === region.value)
        if (rows.length === 0) return null
        return (
          <section key={region.value} className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="border-b border-line px-4 py-3 font-medium">{region.label}</div>
            {rows.map((rate) => (
              <div key={rate.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <p className="min-w-40 flex-1 text-sm">
                  {rate.min_weight_grams}–{rate.max_weight_grams} g
                </p>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={drafts[rate.id] ?? ''}
                  onChange={(event) => setDrafts((current) => ({ ...current, [rate.id]: event.target.value }))}
                  className="min-h-11 w-32 rounded-md border border-line px-3"
                />
                <Button disabled={savingId === rate.id} onClick={() => void save(rate)}>
                  Save
                </Button>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
