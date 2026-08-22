import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { DeliveryRate, DeliveryRegion } from '@/types/database'

export async function fetchDeliveryRates(siteId: string): Promise<DeliveryRate[]> {
  const { data, error } = await supabase
    .from('delivery_rates')
    .select('*')
    .eq('site_id', siteId)
    .order('destination_region')
    .order('min_weight_grams')

  return throwIfError((data ?? []) as DeliveryRate[], error, 'Unable to load delivery rates.')
}

export async function lookupDeliveryFee(
  siteId: string,
  destinationRegion: DeliveryRegion,
  weightGrams: number,
): Promise<number | null> {
  const { data, error } = await supabase.rpc('lookup_delivery_fee', {
    target_site_id: siteId,
    destination_region: destinationRegion,
    weight_grams: weightGrams,
  })

  if (error) {
    throw new Error(error.message || 'Unable to calculate the delivery fee.')
  }

  return data == null ? null : Number(data)
}

export async function updateDeliveryRate(id: string, fee: number): Promise<DeliveryRate> {
  const { data, error } = await supabase
    .from('delivery_rates')
    .update({ fee })
    .eq('id', id)
    .select('*')
    .single()

  return throwIfError(data as DeliveryRate | null, error, 'Unable to save this rate.')
}

export function chargeableWeightGrams(
  actualGrams: number,
  lengthCm?: number | null,
  widthCm?: number | null,
  heightCm?: number | null,
  divisor = 3500,
): number {
  let volumetric = 0
  if (lengthCm && widthCm && heightCm && divisor > 0) {
    volumetric = Math.ceil(((lengthCm * widthCm * heightCm) / divisor) * 1000)
  }
  return Math.max(actualGrams || 0, volumetric, 1)
}
