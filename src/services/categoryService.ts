import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { ProductCategory } from '@/types/database'

export async function fetchCategoryById(id: string): Promise<ProductCategory> {
  const { data, error } = await supabase.from('product_categories').select('*').eq('id', id).single()
  return throwIfError(data as ProductCategory | null, error, 'Unable to load this category.')
}

export async function fetchCategories(siteId: string, activeOnly = false): Promise<ProductCategory[]> {
  let query = supabase
    .from('product_categories')
    .select('*')
    .eq('site_id', siteId)
    .order('sort_order')
    .order('name')

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  return throwIfError((data ?? []) as ProductCategory[], error, 'Unable to load categories.')
}

export async function createCategory(
  siteId: string,
  input: Pick<ProductCategory, 'name' | 'slug'> & Partial<Pick<ProductCategory, 'description' | 'image_url' | 'sort_order' | 'is_active'>>,
): Promise<ProductCategory> {
  const { data, error } = await supabase
    .from('product_categories')
    .insert({ ...input, site_id: siteId })
    .select('*')
    .single()

  return throwIfError(data as ProductCategory | null, error, 'Unable to create this category.')
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<ProductCategory, 'name' | 'slug' | 'description' | 'image_url' | 'sort_order' | 'is_active'>>,
): Promise<ProductCategory> {
  const { data, error } = await supabase
    .from('product_categories')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  return throwIfError(data as ProductCategory | null, error, 'Unable to update this category.')
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('product_categories').delete().eq('id', id)
  if (error) {
    throw new Error(error.message || 'Unable to delete this category.')
  }
}
