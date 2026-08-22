import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProductCard } from '@/components/ProductCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageLoader } from '@/components/ui/Spinner'
import { useSite } from '@/contexts/SiteContext'
import { fetchCategories } from '@/services/categoryService'
import { fetchProducts } from '@/services/productService'
import type { ProductCategory, ProductWithRelations } from '@/types/database'

export default function ProductsPage() {
  const { siteId } = useSite()
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const query = params.get('q') ?? ''
  const categoryId = params.get('category') ?? ''

  useEffect(() => {
    const currentSiteId = siteId
    if (!currentSiteId) return
    let cancelled = false

    async function load(id: string) {
      setLoading(true)
      try {
        const [nextProducts, nextCategories] = await Promise.all([
          fetchProducts(id, {
            publishedOnly: true,
            query,
            categoryId: categoryId || null,
          }),
          fetchCategories(id, true),
        ])
        if (!cancelled) {
          setProducts(nextProducts)
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
  }, [siteId, query, categoryId])

  const title = useMemo(() => {
    const category = categories.find((item) => item.id === categoryId)
    return category?.name ?? 'All products'
  }, [categories, categoryId])

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="section-kicker">Shop</p>
      <h1 className="mt-2 font-display text-4xl">{title}</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_14rem]">
        <Input
          label="Search"
          value={query}
          placeholder="Search medicines, vitamins, SKU…"
          onChange={(event) => updateParam('q', event.target.value)}
        />
        <Select
          label="Category"
          value={categoryId}
          onChange={(event) => updateParam('category', event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-8">
        {loading ? (
          <PageLoader label="Loading products…" />
        ) : products.length === 0 ? (
          <EmptyState title="No products found" description="Try another search or category." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
