import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'

export function ProtectedCustomerRoute() {
  const location = useLocation()
  const { loading: siteLoading } = useSite()
  const { loading, user, customer } = useAuth()
  const next = `${location.pathname}${location.search}`

  if (siteLoading || loading) {
    return <PageLoader label="Checking your account…" />
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  if (!customer) {
    return <Navigate to={`/register?next=${encodeURIComponent(next)}`} replace />
  }

  return <Outlet />
}
