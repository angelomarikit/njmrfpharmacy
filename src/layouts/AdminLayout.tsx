import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Tags,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { PageFade } from '@/components/PageFade'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { Button } from '@/components/ui/Button'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/orders', label: 'Orders', icon: Wallet },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/delivery', label: 'J&T rates', icon: Truck },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminLayout() {
  const { site } = useSite()
  const { signOut, role, user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/admin')
  }

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-forest text-white' : 'text-ink/65 hover:bg-paper-2 hover:text-ink',
              ].join(' ')
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[18.5rem_1fr]">
      <aside className="hidden border-r border-line bg-white lg:flex lg:min-h-screen lg:flex-col">
        <div className="border-b border-line px-5 py-6">
          <BrandLogo size="admin" />
          <p className="mt-3 text-[11px] tracking-[0.16em] text-forest uppercase">Staff</p>
        </div>
        {nav}
        <div className="mt-auto border-t border-line p-4 text-xs text-muted">
          {user?.email}
          {role ? ` · ${role}` : ''}
        </div>
      </aside>

      <div className="bg-paper-2/70">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-white/90 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-full border border-line bg-white p-2 lg:hidden"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[11px] tracking-[0.16em] text-forest uppercase">Operations</p>
              <p className="text-sm font-medium">Messiah Sanare Pharmacy</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void handleSignOut()}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </header>

        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-ink/30"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
            />
            <aside className="relative h-full w-72 bg-white">
              <div className="flex items-center justify-between px-4 py-4">
                <p className="font-display text-lg">{site?.name}</p>
                <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              {nav}
            </aside>
          </div>
        ) : null}

        <div className="px-4 py-6 sm:px-8">
          <PageFade>
            <Outlet />
          </PageFade>
        </div>
      </div>
    </div>
  )
}
