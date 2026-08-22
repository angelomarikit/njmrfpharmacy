import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { formatPeso } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { ProductWithRelations } from '@/types/database'

export function ProductTable({
  products,
  showCategory = true,
}: {
  products: ProductWithRelations[]
  showCategory?: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-line bg-paper-2/80 text-xs tracking-[0.12em] text-muted uppercase">
          <tr>
            <th className="px-4 py-3 font-semibold">Product</th>
            <th className="px-4 py-3 font-semibold">Price</th>
            <th className="px-4 py-3 font-semibold">Stock</th>
            {showCategory ? <th className="px-4 py-3 font-semibold">Category</th> : null}
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-line last:border-b-0 hover:bg-paper">
              <td className="px-4 py-3">
                <Link to={`/admin/products/${product.id}`} className="font-medium text-ink hover:text-forest">
                  {product.title}
                </Link>
                {product.sku ? <p className="mt-0.5 text-xs text-muted">SKU {product.sku}</p> : null}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{formatPeso(product.price)}</td>
              <td className={cn('px-4 py-3 whitespace-nowrap', product.stock_quantity <= 0 && 'text-red-700')}>
                {product.stock_quantity}
              </td>
              {showCategory ? (
                <td className="px-4 py-3 text-muted">{product.product_categories?.name ?? 'Uncategorized'}</td>
              ) : null}
              <td className="px-4 py-3">
                <Badge tone={product.is_published ? 'teal' : 'muted'}>
                  {product.is_published ? 'Published' : 'Draft'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
