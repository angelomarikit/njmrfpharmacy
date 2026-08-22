import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { CartItem, CartItemWithProduct } from '@/types/database'

const CART_SELECT = '*, products(*, product_images(*), product_categories(id, name, slug))'

export async function fetchCart(customerId: string): Promise<CartItemWithProduct[]> {
  const { data, error } = await supabase
    .from('cart_items')
    .select(CART_SELECT)
    .eq('customer_id', customerId)
    .order('created_at')

  const items = throwIfError((data ?? []) as CartItemWithProduct[], error, 'Unable to load your cart.')
  return items.map((item) => ({
    ...item,
    products: item.products
      ? {
          ...item.products,
          product_images: [...(item.products.product_images ?? [])].sort(
            (a, b) => a.sort_order - b.sort_order,
          ),
        }
      : null,
  }))
}

export async function upsertCartItem(
  siteId: string,
  customerId: string,
  productId: string,
  quantity: number,
): Promise<CartItem> {
  const { data, error } = await supabase
    .from('cart_items')
    .upsert(
      {
        site_id: siteId,
        customer_id: customerId,
        product_id: productId,
        quantity,
      },
      { onConflict: 'customer_id,product_id' },
    )
    .select('*')
    .single()

  return throwIfError(data as CartItem | null, error, 'Unable to update your cart.')
}

export async function removeCartItem(id: string): Promise<void> {
  const { error } = await supabase.from('cart_items').delete().eq('id', id)
  if (error) {
    throw new Error(error.message || 'Unable to remove this item.')
  }
}

export async function clearCart(customerId: string): Promise<void> {
  const { error } = await supabase.from('cart_items').delete().eq('customer_id', customerId)
  if (error) {
    throw new Error(error.message || 'Unable to clear your cart.')
  }
}
