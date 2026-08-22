import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Package, QrCode, Truck } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import { Reveal } from '@/components/Reveal'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import { useSite } from '@/contexts/SiteContext'
import { storeImages } from '@/data/images'
import { useParallax } from '@/hooks/useParallax'
import { fetchCategories } from '@/services/categoryService'
import { fetchProducts } from '@/services/productService'
import type { ProductCategory, ProductWithRelations } from '@/types/database'

export default function HomePage() {
  const { site, siteId } = useSite()
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const phone = site?.phone || '09457742858'
  const email = site?.email || 'njmrf.pharmacy@gmail.com'
  const heroImage = site?.hero_image_url || storeImages.hero
  const offset = useParallax(0.18)

  useEffect(() => {
    const currentSiteId = siteId
    if (!currentSiteId) return
    let cancelled = false

    async function load(id: string) {
      setLoading(true)
      try {
        const [nextProducts, nextCategories] = await Promise.all([
          fetchProducts(id, { publishedOnly: true }),
          fetchCategories(id, true),
        ])
        if (!cancelled) {
          setProducts(nextProducts.slice(0, 8))
          setCategories(nextCategories)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(currentSiteId)
    return () => {
      cancelled = true
    }
  }, [siteId])

  if (!site) return null

  return (
    <main>
      <section className="relative overflow-hidden">
        <img
          src={heroImage}
          alt="Pharmacy counter in the Philippines"
          className="hero-media absolute inset-0 h-[120%] w-full object-cover"
          style={{ transform: `translate3d(0, ${offset}px, 0) scale(1.08)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/45 to-ink/10" />
        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-10 sm:pt-28 sm:pb-14">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-white/80 uppercase">
              Messiah Sanare · Community care
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.08] text-white sm:text-6xl">
              {site.hero_heading || 'Medicines for the home, prepared with care.'}
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/85 sm:text-lg">
              {site.hero_subheading ||
                'Order from NJMRF Messiah Sanare Pharmacy, pay by QR, and receive your parcel through J&T Express.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products">
                <Button>
                  Shop products
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href={`tel:${phone}`}>
                <Button variant="outline" className="border-white/35 bg-white/10 text-white hover:border-white hover:bg-white hover:text-ink">
                  Call {phone}
                </Button>
              </a>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-3 sm:gap-6">
            {[
              { icon: Package, title: 'Browse live stock', text: 'See what is available before you add to cart.' },
              { icon: QrCode, title: 'Pay by QR', text: 'Send the exact total, then upload your screenshot.' },
              { icon: Truck, title: 'J&T Express', text: 'Delivery follows published J&T destination rates.' },
            ].map((item) => (
              <article
                key={item.title}
                className="group h-full rounded-2xl bg-white/95 p-6 shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_20px_40px_-24px_rgba(15,23,42,0.45)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forest/10 text-forest transition duration-300 group-hover:scale-110 group-hover:bg-forest group-hover:text-white">
                  <item.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 font-display text-lg text-ink">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2">
        <Reveal>
          <div className="overflow-hidden rounded-3xl">
            <img src={storeImages.pharmacist} alt="Pharmacist preparing an order" className="h-full min-h-80 w-full object-cover" />
          </div>
        </Reveal>
        <Reveal delay={80}>
          <p className="section-kicker">Why patients choose us</p>
          <h2 className="mt-3 font-display text-4xl leading-tight">A familiar botica, now with a quiet online counter.</h2>
          <p className="mt-4 text-muted">
            We keep the same care you expect at the window: clear prices, stock you can trust, and a pharmacist
            you can call. Online orders are reviewed by staff before packing and shipping.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-ink/80">
            <li>Verified payment screenshots before we pack</li>
            <li>Pickup at the pharmacy or J&T door-to-door</li>
            <li>Support on {phone} or {email}</li>
          </ul>
        </Reveal>
      </section>

      {categories.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-6">
          <Reveal>
            <div className="mb-5 flex items-end justify-between">
              <h2 className="font-display text-3xl">Shop by need</h2>
              <Link to="/products" className="text-sm text-forest hover:underline">
                View all
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/products?category=${category.id}`}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm transition hover:border-forest hover:text-forest"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <Reveal>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="section-kicker">Featured</p>
              <h2 className="mt-2 font-display text-3xl">On the shelf</h2>
            </div>
            <Link to="/products" className="text-sm text-forest hover:underline">
              Shop all
            </Link>
          </div>
        </Reveal>
        {loading ? (
          <PageLoader label="Loading products…" />
        ) : products.length === 0 ? (
          <Reveal>
            <EmptyState
              title="The catalog is being prepared"
              description="Staff can publish medicines from the admin panel. Until then, call the pharmacy for available stock."
              action={
                <a href={`tel:${phone}`}>
                  <Button>Call {phone}</Button>
                </a>
              }
            />
          </Reveal>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product, index) => (
              <Reveal key={product.id} delay={index * 70}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
