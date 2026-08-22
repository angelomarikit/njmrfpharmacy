import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import { ProductTable } from '@/components/admin/ProductTable'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { deleteCategory, fetchCategoryById } from '@/services/categoryService'
import { fetchProducts } from '@/services/productService'
import { toUserMessage } from '@/lib/errors'
import type { ProductCategory, ProductWithRelations } from '@/types/database'

export default function CategoryProductsPage() {
  const { id = '' } = useParams()
  const { siteId } = useSite()
  const toast = useToast()
  const navigate = useNavigate()
  const [category, setCategory] = useState<ProductCategory | null>(null)
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const currentSiteId = siteId
    if (!currentSiteId || !id) return
    let cancelled = false

    async function load(site: string, categoryId: string) {
      setLoading(true)
      setMissing(false)
      try {
        const [nextCategory, nextProducts] = await Promise.all([
          fetchCategoryById(categoryId),
          fetchProducts(site, { categoryId }),
        ])
        if (cancelled) return
        setCategory(nextCategory)
        setProducts(nextProducts)
      } catch {
        if (!cancelled) setMissing(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(currentSiteId, id)
    return () => {
      cancelled = true
    }
  }, [siteId, id])

  async function handleDelete() {
    if (!category) return
    setDeleting(true)
    try {
      await deleteCategory(category.id)
      toast.success('Category deleted')
      navigate('/admin/categories')
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to delete this category.'))
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) return <PageLoader label="Loading category…" />

  if (missing || !category) {
    return (
      <EmptyState
        title="Category not found"
        description="It may have been removed."
        action={
          <Link to="/admin/categories">
            <Button variant="outline">Back to categories</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/admin/categories" className="text-sm text-forest hover:underline">
            Back to categories
          </Link>
          <h1 className="font-display text-3xl">{category.name}</h1>
          {category.description ? <p className="mt-1 text-sm text-muted">{category.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete category
          </Button>
          <Link to={`/admin/products/new?category=${category.id}`}>
            <Button>Add product</Button>
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="No products in this category"
          description="Add a product and it will show up here."
          action={
            <Link to={`/admin/products/new?category=${category.id}`}>
              <Button>Add product</Button>
            </Link>
          }
        />
      ) : (
        <ProductTable products={products} showCategory={false} />
      )}
      <ConfirmModal
        open={confirmDelete}
        title="Delete this category?"
        description={
          products.length > 0
            ? `“${category.name}” will be removed. Its ${products.length} ${products.length === 1 ? 'product' : 'products'} will stay in the catalog as uncategorized.`
            : `“${category.name}” will be removed. This cannot be undone.`
        }
        confirmLabel="Delete category"
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onClose={() => {
          if (!deleting) setConfirmDelete(false)
        }}
      />
    </div>
  )
}
