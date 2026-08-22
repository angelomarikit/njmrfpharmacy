import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { Product, ProductImage, ProductInput, ProductWithRelations } from '@/types/database'

const PRODUCT_SELECT = '*, product_images(*), product_categories(id, name, slug)'

export async function fetchProducts(
  siteId: string,
  options?: {
    publishedOnly?: boolean
    categoryId?: string | null
    query?: string
    lowStockOnly?: boolean
  },
): Promise<ProductWithRelations[]> {
  let request = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('site_id', siteId)
    .order('sort_order')
    .order('title')

  if (options?.publishedOnly) {
    request = request.eq('is_published', true)
  }
  if (options?.categoryId) {
    request = request.eq('category_id', options.categoryId)
  }
  if (options?.query?.trim()) {
    const q = options.query.trim().replace(/,/g, '')
    request = request.or(`title.ilike.%${q}%,sku.ilike.%${q}%,description.ilike.%${q}%`)
  }

  const { data, error } = await request
  let products = throwIfError((data ?? []) as ProductWithRelations[], error, 'Unable to load products.')

  products = products.map((product) => ({
    ...product,
    product_images: [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }))

  if (options?.lowStockOnly) {
    products = products.filter((product) => product.stock_quantity <= product.low_stock_threshold)
  }

  return products
}

export async function fetchProductBySlug(siteId: string, slug: string): Promise<ProductWithRelations | null> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('site_id', siteId)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Unable to load this product.')
  }

  if (!data) return null

  const product = data as ProductWithRelations
  return {
    ...product,
    product_images: [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }
}

export async function fetchProductById(id: string): Promise<ProductWithRelations> {
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('id', id).single()
  const product = throwIfError(data as ProductWithRelations | null, error, 'Unable to load this product.')
  return {
    ...product,
    product_images: [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }
}

export async function createProduct(siteId: string, input: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({ ...input, site_id: siteId })
    .select('*')
    .single()

  return throwIfError(data as Product | null, error, 'Unable to create this product.')
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const { data, error } = await supabase.from('products').update(input).eq('id', id).select('*').single()
  return throwIfError(data as Product | null, error, 'Unable to save this product.')
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) {
    throw new Error(error.message || 'Unable to delete this product.')
  }
}

export async function addProductImage(
  siteId: string,
  productId: string,
  imageUrl: string,
  sortOrder: number,
): Promise<ProductImage> {
  const { data, error } = await supabase
    .from('product_images')
    .insert({
      site_id: siteId,
      product_id: productId,
      image_url: imageUrl,
      sort_order: sortOrder,
    })
    .select('*')
    .single()

  return throwIfError(data as ProductImage | null, error, 'Unable to save this image.')
}

export async function deleteProductImage(id: string): Promise<void> {
  const { error } = await supabase.from('product_images').delete().eq('id', id)
  if (error) {
    throw new Error(error.message || 'Unable to remove this image.')
  }
}
