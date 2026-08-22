import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { fetchCart, removeCartItem, upsertCartItem } from '@/services/cartService'
import { fetchProductById } from '@/services/productService'
import type { ProductWithRelations } from '@/types/database'

export interface CartLine {
  product: ProductWithRelations
  quantity: number
  serverId?: string
}

interface CartContextValue {
  lines: CartLine[]
  count: number
  subtotal: number
  loading: boolean
  addItem: (product: ProductWithRelations, quantity?: number) => Promise<void>
  setQuantity: (productId: string, quantity: number) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  refresh: () => Promise<void>
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

function storageKey(slug: string) {
  return `njmrf-cart:${slug}`
}

function readGuestCart(slug: string): Array<{ productId: string; quantity: number }> {
  try {
    const raw = localStorage.getItem(storageKey(slug))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<{ productId: string; quantity: number }>
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeGuestCart(slug: string, items: Array<{ productId: string; quantity: number }>) {
  localStorage.setItem(storageKey(slug), JSON.stringify(items))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { siteId, siteSlug } = useSite()
  const { customer } = useAuth()
  const [lines, setLines] = useState<CartLine[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!siteId) {
      setLines([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      if (customer) {
        const guestItems = readGuestCart(siteSlug)
        if (guestItems.length > 0) {
          const serverItems = await fetchCart(customer.id)
          for (const guest of guestItems) {
            const existing = serverItems.find((item) => item.product_id === guest.productId)
            const nextQuantity = (existing?.quantity ?? 0) + guest.quantity
            await upsertCartItem(siteId, customer.id, guest.productId, nextQuantity)
          }
          writeGuestCart(siteSlug, [])
        }

        const items = await fetchCart(customer.id)
        setLines(
          items
            .filter((item) => item.products)
            .map((item) => ({
              product: item.products as ProductWithRelations,
              quantity: item.quantity,
              serverId: item.id,
            })),
        )
        return
      }

      const guestItems = readGuestCart(siteSlug)
      const loaded: CartLine[] = []
      for (const item of guestItems) {
        try {
          const product = await fetchProductById(item.productId)
          if (product.is_published) {
            loaded.push({ product, quantity: item.quantity })
          }
        } catch {
          // Skip missing products.
        }
      }
      setLines(loaded)
    } finally {
      setLoading(false)
    }
  }, [customer, siteId, siteSlug])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const persistGuest = useCallback(
    (next: CartLine[]) => {
      writeGuestCart(
        siteSlug,
        next.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      )
    },
    [siteSlug],
  )

  const addItem = useCallback(
    async (product: ProductWithRelations, quantity = 1) => {
      const existing = lines.find((line) => line.product.id === product.id)
      const nextQuantity = Math.min(product.stock_quantity, (existing?.quantity ?? 0) + quantity)
      if (nextQuantity < 1) return

      if (customer && siteId) {
        await upsertCartItem(siteId, customer.id, product.id, nextQuantity)
        await refresh()
        return
      }

      const next = existing
        ? lines.map((line) => (line.product.id === product.id ? { ...line, quantity: nextQuantity } : line))
        : [...lines, { product, quantity: nextQuantity }]
      setLines(next)
      persistGuest(next)
    },
    [customer, lines, persistGuest, refresh, siteId],
  )

  const setQuantity = useCallback(
    async (productId: string, quantity: number) => {
      const line = lines.find((item) => item.product.id === productId)
      if (!line) return
      const nextQuantity = Math.max(1, Math.min(line.product.stock_quantity, quantity))

      if (customer && siteId) {
        await upsertCartItem(siteId, customer.id, productId, nextQuantity)
        await refresh()
        return
      }

      const next = lines.map((item) =>
        item.product.id === productId ? { ...item, quantity: nextQuantity } : item,
      )
      setLines(next)
      persistGuest(next)
    },
    [customer, lines, persistGuest, refresh, siteId],
  )

  const removeItem = useCallback(
    async (productId: string) => {
      const line = lines.find((item) => item.product.id === productId)
      if (customer && line?.serverId) {
        await removeCartItem(line.serverId)
        await refresh()
        return
      }

      const next = lines.filter((item) => item.product.id !== productId)
      setLines(next)
      persistGuest(next)
    },
    [customer, lines, persistGuest, refresh],
  )

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: lines.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0),
      loading,
      addItem,
      setQuantity,
      removeItem,
      refresh,
    }),
    [addItem, lines, loading, refresh, removeItem, setQuantity],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
