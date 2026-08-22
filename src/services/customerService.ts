import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type { CustomerAddress, CustomerProfile, DeliveryRegion } from '@/types/database'

export async function fetchCustomerProfile(
  userId: string,
  siteId: string,
): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('site_id', siteId)
    .maybeSingle()

  if (error) {
    console.error('Failed to load customer profile', error.message)
    throw new Error('Unable to load your customer account.')
  }

  return data as CustomerProfile | null
}

export async function createCustomerProfile(
  siteId: string,
  userId: string,
  fullName: string,
  phone?: string | null,
): Promise<CustomerProfile> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .insert({
      site_id: siteId,
      user_id: userId,
      full_name: fullName.trim(),
      phone: phone?.trim() || null,
    })
    .select('*')
    .single()

  return throwIfError(data as CustomerProfile | null, error, 'Unable to create your customer account.')
}

export async function updateCustomerProfile(
  id: string,
  updates: Pick<CustomerProfile, 'full_name'> & Partial<Pick<CustomerProfile, 'phone'>>,
): Promise<CustomerProfile> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  return throwIfError(data as CustomerProfile | null, error, 'Unable to save your profile.')
}

export async function fetchCustomers(siteId: string): Promise<CustomerProfile[]> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  return throwIfError((data ?? []) as CustomerProfile[], error, 'Unable to load customers.')
}

export async function fetchCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  return throwIfError((data ?? []) as CustomerAddress[], error, 'Unable to load addresses.')
}

export async function createCustomerAddress(
  siteId: string,
  customerId: string,
  input: {
    label?: string | null
    recipient_name: string
    phone: string
    street: string
    barangay?: string | null
    city: string
    province: string
    postal_code?: string | null
    region: DeliveryRegion
    is_default?: boolean
  },
): Promise<CustomerAddress> {
  const { data, error } = await supabase
    .from('customer_addresses')
    .insert({
      site_id: siteId,
      customer_id: customerId,
      ...input,
    })
    .select('*')
    .single()

  return throwIfError(data as CustomerAddress | null, error, 'Unable to save this address.')
}
