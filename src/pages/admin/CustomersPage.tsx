import { useEffect, useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import { useSite } from '@/contexts/SiteContext'
import { fetchCustomers } from '@/services/customerService'
import { formatDateTime } from '@/utils/format'
import type { CustomerProfile } from '@/types/database'

export default function CustomersPage() {
  const { siteId } = useSite()
  const [customers, setCustomers] = useState<CustomerProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!siteId) return
    void fetchCustomers(siteId)
      .then(setCustomers)
      .finally(() => setLoading(false))
  }, [siteId])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-forest uppercase">Accounts</p>
        <h1 className="font-display text-3xl">Customers</h1>
      </div>
      {loading ? (
        <PageLoader label="Loading customers…" />
      ) : customers.length === 0 ? (
        <EmptyState title="No customers yet" />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {customers.map((customer) => (
            <div key={customer.id} className="border-b border-line px-4 py-3 last:border-b-0">
              <p className="font-medium">{customer.full_name}</p>
              <p className="text-sm text-muted">
                {customer.phone || 'No phone'} · Joined {formatDateTime(customer.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
