import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { StoreSettings, StoreSettingsUpdate } from '@/types/database'

export async function fetchStoreSettings(siteId: string): Promise<StoreSettings | null> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('site_id', siteId)
    .maybeSingle()

  if (error) {
    console.error('Failed to load store settings', error.message)
    throw new Error('Unable to load store settings.')
  }

  return data as StoreSettings | null
}

export async function updateStoreSettings(
  siteId: string,
  updates: StoreSettingsUpdate,
): Promise<StoreSettings> {
  const { data, error } = await supabase
    .from('store_settings')
    .update(updates)
    .eq('site_id', siteId)
    .select('*')
    .single()

  return throwIfError(data as StoreSettings | null, error, 'Unable to save store settings.')
}
