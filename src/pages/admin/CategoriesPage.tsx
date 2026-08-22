import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { PageLoader } from '@/components/ui/Spinner'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { createCategory, deleteCategory, fetchCategories } from '@/services/categoryService'
import { fetchProducts } from '@/services/productService'
import { slugify } from '@/utils/slug'
import { toUserMessage } from '@/lib/errors'
import type { ProductCategory } from '@/types/database'

export default function CategoriesPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ProductCategory | null>(null)

  useEffect(() => {
    const currentSiteId = siteId
    if (!currentSiteId) return
    let cancelled = false

    async function load(id: string) {
      setLoading(true)
      try {
        const [nextCategories, products] = await Promise.all([fetchCategories(id), fetchProducts(id)])
        if (cancelled) return
        const nextCounts: Record<string, number> = {}
        for (const product of products) {
          if (!product.category_id) continue
          nextCounts[product.category_id] = (nextCounts[product.category_id] ?? 0) + 1
        }
        setCategories(nextCategories)
        setCounts(nextCounts)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(currentSiteId)
    return () => {
      cancelled = true
    }
  }, [siteId])

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  )

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!siteId || !name.trim()) return
    setSaving(true)
    try {
      const created = await createCategory(siteId, {
        name: name.trim(),
        slug: slugify(name),
        description: description.trim() || null,
        is_active: true,
      })
      setCategories((current) => [...current, created])
      setCounts((current) => ({ ...current, [created.id]: 0 }))
      setName('')
      setDescription('')
      toast.success('Category created')
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to create this category.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setDeletingId(pendingDelete.id)
    try {
      await deleteCategory(pendingDelete.id)
      setCategories((current) => current.filter((item) => item.id !== pendingDelete.id))
      setCounts((current) => {
        const next = { ...current }
        delete next[pendingDelete.id]
        return next
      })
      toast.success('Category deleted')
      setPendingDelete(null)
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to delete this category.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-forest uppercase">Catalog</p>
        <h1 className="font-display text-3xl">Categories</h1>
        <p className="mt-1 text-sm text-muted">Create a shelf, then open it to see every product inside.</p>
      </div>

      <form className="space-y-4 rounded-3xl border border-line bg-white p-5" onSubmit={(event) => void handleCreate(event)}>
        <h2 className="font-display text-xl">Create category</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Input
            label="Category name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Vitamins"
            required
          />
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Creating…' : 'Create category'}
          </Button>
        </div>
        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Everyday supplements and multivitamins"
        />
      </form>

      {loading ? (
        <PageLoader label="Loading categories…" />
      ) : sorted.length === 0 ? (
        <EmptyState title="No categories yet" description="Create one above, then add products to it." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          {sorted.map((category) => {
            const count = counts[category.id] ?? 0
            return (
              <div
                key={category.id}
                className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 last:border-b-0 hover:bg-paper"
              >
                <Link to={`/admin/categories/${category.id}`} className="min-w-0 flex-1">
                  <p className="font-medium">{category.name}</p>
                  {category.description ? <p className="mt-0.5 text-sm text-muted">{category.description}</p> : null}
                  <p className="mt-1 text-sm text-muted">
                    {count} {count === 1 ? 'product' : 'products'}
                  </p>
                </Link>
                <Button variant="danger" onClick={() => setPendingDelete(category)}>
                  Delete
                </Button>
              </div>
            )
          })}
        </div>
      )}
      <ConfirmModal
        open={pendingDelete != null}
        title="Delete this category?"
        description={
          pendingDelete
            ? (counts[pendingDelete.id] ?? 0) > 0
              ? `“${pendingDelete.name}” will be removed. Its ${counts[pendingDelete.id]} ${(counts[pendingDelete.id] ?? 0) === 1 ? 'product' : 'products'} will stay in the catalog as uncategorized.`
              : `“${pendingDelete.name}” will be removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete category"
        busy={deletingId != null}
        onConfirm={() => void handleDelete()}
        onClose={() => {
          if (deletingId == null) setPendingDelete(null)
        }}
      />
    </div>
  )
}
