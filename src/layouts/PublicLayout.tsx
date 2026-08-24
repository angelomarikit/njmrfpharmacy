import { Link, NavLink, Outlet } from 'react-router-dom'
import { Facebook, Mail, Phone, ShoppingBag, UserRound } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { PageFade } from '@/components/PageFade'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useSite } from '@/contexts/SiteContext'
import { useScrolled } from '@/hooks/useScrolled'
import { PageLoader } from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'

export function PublicLayout() {
  const { site, loading, error } = useSite()
  const { count } = useCart()
  const { user, customer, isSiteAdmin } = useAuth()
  const phone = site?.phone || '09457742858'
  const email = site?.email || 'njmrf.pharmacy@gmail.com'
  const facebookUrl = site?.facebook_url || 'https://www.facebook.com/NJMRFPHARMACY'
  const scrolled = useScrolled(12)

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <PageLoader label="Loading store…" />
      </div>
    )
  }

  if (error || !site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div>
          <h1 className="font-display text-3xl">Store unavailable</h1>
          <p className="mt-3 max-w-md text-muted">{error ?? 'This website is not configured yet.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 text-xs text-muted sm:text-sm">
          <p>Licensed neighborhood pharmacy · Philippines</p>
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
            <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 text-forest hover:underline">
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </a>
            <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 text-forest hover:underline">
              <Mail className="h-3.5 w-3.5" />
              {email}
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-forest hover:underline"
            >
              <Facebook className="h-3.5 w-3.5" />
              @NJMRFPHARMACY
            </a>
          </div>
        </div>
      </div>

      <header
        className={cn(
          'sticky top-0 z-40 border-b bg-white/90 backdrop-blur-xl transition-shadow duration-300',
          scrolled ? 'border-line shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)]' : 'border-transparent',
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2 sm:gap-6 sm:px-4 sm:py-2.5">
          <Link to="/" className="flex shrink-0 items-center" aria-label="NJMRF Messiah Sanare Pharmacy">
            <BrandLogo />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium tracking-[0.14em] uppercase md:flex">
            <NavLink to="/" className={({ isActive }) => (isActive ? 'text-forest' : 'text-ink/70 hover:text-forest')}>
              Home
            </NavLink>
            <NavLink
              to="/products"
              className={({ isActive }) => (isActive ? 'text-forest' : 'text-ink/70 hover:text-forest')}
            >
              Shop
            </NavLink>
            {user ? (
              <NavLink
                to="/account"
                className={({ isActive }) => (isActive ? 'text-forest' : 'text-ink/70 hover:text-forest')}
              >
                {customer?.full_name ?? 'Account'}
              </NavLink>
            ) : (
              <NavLink
                to="/login"
                className={({ isActive }) => (isActive ? 'text-forest' : 'text-ink/70 hover:text-forest')}
              >
                Sign in
              </NavLink>
            )}
            {isSiteAdmin ? (
              <NavLink to="/admin/dashboard" className="text-ink/70 hover:text-forest">
                Admin
              </NavLink>
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to={user ? '/account' : '/login'}
              className="rounded-full border border-line bg-white p-2 md:hidden"
              aria-label="Account"
            >
              <UserRound className="h-5 w-5" />
            </Link>
            <Link to="/cart" className="relative rounded-full border border-line bg-white p-2" aria-label="Cart">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-forest px-1 text-center text-xs text-white">
                  {count}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      <PageFade>
        <Outlet />
      </PageFade>

      <footer className="mt-20 border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3">
          <div>
            <BrandLogo size="footer" />
            <p className="mt-4 max-w-sm text-sm text-muted">
              {site.short_description ||
                'A community pharmacy for everyday medicines, vitamins, and home delivery through J&T Express.'}
            </p>
          </div>
          <div>
            <p className="section-kicker">Contact</p>
            <a href={`tel:${phone}`} className="mt-3 block text-lg text-ink hover:text-forest">
              {phone}
            </a>
            <a href={`mailto:${email}`} className="mt-1 block text-sm text-ink hover:text-forest">
              {email}
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink hover:text-forest"
            >
              <Facebook className="h-3.5 w-3.5" />
              @NJMRFPHARMACY
            </a>
            {site.address ? <p className="mt-2 text-sm text-muted">{site.address}</p> : null}
          </div>
          <div>
            <p className="section-kicker">Visit</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted">
              <Link to="/products" className="hover:text-forest">
                Shop medicines
              </Link>
              <Link to="/account" className="hover:text-forest">
                My orders
              </Link>
              <Link to="/admin" className="hover:text-forest">
                Staff login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
