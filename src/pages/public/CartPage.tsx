import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCart } from '@/contexts/CartContext'
import { formatPeso } from '@/utils/format'

export default function CartPage() {
  const { lines, subtotal, setQuantity, removeItem } = useCart()

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="section-kicker">Your bag</p>
      <h1 className="mt-2 font-display text-4xl">Cart</h1>
      {lines.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Your cart is empty"
            description="Browse medicines and add items when you are ready."
            action={
              <Link to="/products">
                <Button>Shop products</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {lines.map((line) => {
            const image = line.product.product_images[0]?.image_url
            return (
              <div key={line.product.id} className="flex gap-4 rounded-3xl border border-line bg-card p-4">
                <div className="h-24 w-24 overflow-hidden rounded-xl bg-paper-2">
                  {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/products/${line.product.slug}`} className="font-medium hover:text-forest">
                    {line.product.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{formatPeso(line.product.price)}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={line.product.stock_quantity}
                      value={line.quantity}
                      onChange={(event) => void setQuantity(line.product.id, Number(event.target.value) || 1)}
                      className="min-h-10 w-20 rounded-md border border-line px-2"
                    />
                    <button
                      type="button"
                      className="text-sm text-red-700"
                      onClick={() => void removeItem(line.product.id)}
                    >
                      <Trash2 className="mr-1 inline h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
                <p className="font-semibold">{formatPeso(Number(line.product.price) * line.quantity)}</p>
              </div>
            )
          })}
          <div className="flex items-center justify-between rounded-3xl bg-card px-5 py-4">
            <p className="text-muted">Subtotal</p>
            <p className="text-2xl font-semibold text-forest">{formatPeso(subtotal)}</p>
          </div>
          <div className="flex justify-end">
            <Link to="/checkout">
              <Button>Checkout</Button>
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
