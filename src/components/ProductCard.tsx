import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { storeImages } from '@/data/images'
import { formatPeso } from '@/utils/format'
import type { ProductWithRelations } from '@/types/database'

export function ProductCard({ product }: { product: ProductWithRelations }) {
  const image = product.product_images[0]?.image_url ?? storeImages.shelves
  const soldOut = product.stock_quantity <= 0

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.28)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-paper-2">
        <img
          src={image}
          alt={product.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        {soldOut ? (
          <span className="absolute top-3 left-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs text-white">
            Out of stock
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.product_categories ? (
          <p className="text-xs tracking-[0.16em] text-forest uppercase">{product.product_categories.name}</p>
        ) : null}
        <h3 className="font-display text-lg leading-snug">{product.title}</h3>
        {product.is_prescription ? <Badge tone="gold">Prescription</Badge> : null}
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            <p className="text-lg font-semibold text-forest">{formatPeso(product.price)}</p>
            {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) ? (
              <p className="text-xs text-muted line-through">{formatPeso(product.compare_at_price)}</p>
            ) : null}
          </div>
          <span className="text-sm text-muted transition group-hover:text-forest">View</span>
        </div>
      </div>
    </Link>
  )
}
