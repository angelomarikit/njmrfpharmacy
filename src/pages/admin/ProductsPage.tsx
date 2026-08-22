import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageLoader } from '@/components/ui/Spinner'
import { ProductTable } from '@/components/admin/ProductTable'
import { useSite } from '@/contexts/SiteContext'
import { fetchCategories } from '@/services/categoryService'
import { fetchProducts } from '@/services/productService'
import type { ProductCategory, ProductWithRelations } from '@/types/database'

export default function ProductsPage() {
  const { siteId } = useSite()
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentSiteId = siteId
    if (!currentSiteId) return
    let cancelled = false

    async function load(id: string) {
      setLoading(true)
      try {
        const [nextProducts, nextCategories] = await Promise.all([
          fetchProducts(id, { query, categoryId: categoryId || null }),
          fetchCategories(id),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-forest uppercase">Catalog</p>
          <h1 className="font-display text-3xl">Products</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/categories">
            <Button variant="outline">Categories</Button>
          </Link>
          <Link to="/admin/products/new">
            <Button>Add product</Button>
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <Input label="Search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title or SKU" />
        <Select label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">All</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>
      {loading ? (
        <PageLoader label="Loading products…" />
      ) : products.length === 0 ? (
        <EmptyState title="No products yet" description="Add a medicine with title, price, images, and stock." />
      ) : (
        <ProductTable products={products} />
      )}
    </div>
  )
}
