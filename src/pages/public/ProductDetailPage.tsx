import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { useCart } from '@/contexts/CartContext'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchProductBySlug } from '@/services/productService'
import { storeImages } from '@/data/images'
import { formatPeso } from '@/utils/format'
import { toUserMessage } from '@/lib/errors'
import type { ProductWithRelations } from '@/types/database'

export default function ProductDetailPage() {
  const { slug = '' } = useParams()
  const { siteId } = useSite()
  const { addItem } = useCart()
  const toast = useToast()
  const [product, setProduct] = useState<ProductWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    const currentSiteId = siteId
    if (!currentSiteId || !slug) return
    let cancelled = false

    async function load(id: string) {
      setLoading(true)
      try {
        const next = await fetchProductBySlug(id, slug)
        if (!cancelled) {
          setProduct(next)
          setActiveImage(0)
          setQuantity(1)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(currentSiteId)
    return () => {
      cancelled = true
    }
  }, [siteId, slug])

  if (loading) return <PageLoader label="Loading product…" />

  if (!product || !product.is_published) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl">Product not found</h1>
        <Link to="/products" className="mt-4 inline-block text-forest hover:underline">
          Back to shop
        </Link>
      </main>
    )
  }

  const image = product.product_images[activeImage]?.image_url
  const soldOut = product.stock_quantity <= 0

  async function handleAdd() {
    if (!product) return
    setAdding(true)
    try {
      await addItem(product, quantity)
      toast.success('Added to cart')
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to add this item.'))
    } finally {
      setAdding(false)
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-2">
      <div>
        <div className="overflow-hidden rounded-[2rem] border border-line bg-card">
          <img src={image ?? storeImages.shelves} alt={product.title} className="aspect-square w-full object-cover" />
        </div>
        {product.product_images.length > 1 ? (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {product.product_images.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveImage(index)}
                className={`overflow-hidden rounded-xl border ${index === activeImage ? 'border-forest' : 'border-line'}`}
              >
                <img src={item.image_url} alt="" className="aspect-square object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        {product.product_categories ? (
          <p className="text-xs tracking-[0.18em] text-forest uppercase">{product.product_categories.name}</p>
        ) : null}
        <h1 className="mt-2 font-display text-4xl">{product.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-3xl font-semibold text-forest">{formatPeso(product.price)}</p>
          {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) ? (
            <p className="text-muted line-through">{formatPeso(product.compare_at_price)}</p>
          ) : null}
          {product.is_prescription ? <Badge tone="gold">Prescription</Badge> : null}
        </div>
        <p className="mt-4 text-sm text-muted">
          {soldOut ? 'Out of stock' : `${product.stock_quantity} in stock`}
          {product.sku ? ` · SKU ${product.sku}` : ''}
        </p>
        {product.description ? (
          <p className="mt-6 whitespace-pre-wrap text-ink/90">{product.description}</p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-sm font-medium">Quantity</span>
            <input
              type="number"
              min={1}
              max={Math.max(product.stock_quantity, 1)}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              className="mt-1.5 min-h-11 w-24 rounded-md border border-line px-3"
              disabled={soldOut}
            />
          </label>
          <Button disabled={soldOut || adding} onClick={() => void handleAdd()}>
            {soldOut ? 'Out of stock' : 'Add to cart'}
          </Button>
        </div>
      </div>
    </main>
  )
}
