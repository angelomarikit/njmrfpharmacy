import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import type {
  DeliveryRegion,
  FulfillmentType,
  Order,
  OrderStatus,
  OrderWithRelations,
} from '@/types/database'

const ORDER_DETAIL_SELECT =
  '*, order_items(*), order_events(*), customer_profiles(id, full_name, phone, user_id)'

export async function placeOrder(input: {
  siteId: string
  fulfillmentType: FulfillmentType
  recipientName: string
  recipientPhone: string
  street?: string | null
  barangay?: string | null
  city?: string | null
  province?: string | null
  postalCode?: string | null
  region?: DeliveryRegion | null
  customerNotes?: string | null
}): Promise<Order> {
  const { data, error } = await supabase.rpc('place_order', {
    p_site_id: input.siteId,
    p_fulfillment_type: input.fulfillmentType,
    p_recipient_name: input.recipientName,
    p_recipient_phone: input.recipientPhone,
    p_street: input.street ?? null,
    p_barangay: input.barangay ?? null,
    p_city: input.city ?? null,
    p_province: input.province ?? null,
    p_postal_code: input.postalCode ?? null,
    p_region: input.region ?? null,
    p_customer_notes: input.customerNotes ?? null,
  })

  return throwIfError(data as Order | null, error, error?.message || 'Unable to place this order.')
}

export async function submitPaymentProof(
  orderId: string,
  paymentProofUrl: string,
  paymentReference?: string | null,
): Promise<Order> {
  const { data, error } = await supabase.rpc('submit_payment_proof', {
    p_order_id: orderId,
    p_payment_proof_url: paymentProofUrl,
    p_payment_reference: paymentReference ?? null,
  })

  return throwIfError(data as Order | null, error, error?.message || 'Unable to submit the payment screenshot.')
}

export async function setOrderStatus(
  orderId: string,
  status: OrderStatus,
  trackingNumber?: string | null,
  adminNotes?: string | null,
): Promise<Order> {
  const { data, error } = await supabase.rpc('set_order_status', {
    p_order_id: orderId,
    p_status: status,
    p_tracking_number: trackingNumber ?? null,
    p_admin_notes: adminNotes ?? null,
  })

  return throwIfError(data as Order | null, error, error?.message || 'Unable to update this order.')
}

export async function fetchOrders(
  siteId: string,
  options?: { customerId?: string; status?: OrderStatus | 'all'; query?: string },
): Promise<OrderWithRelations[]> {
  let request = supabase
    .from('orders')
    .select('*, order_items(*), customer_profiles(id, full_name, phone, user_id)')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  if (options?.customerId) {
    request = request.eq('customer_id', options.customerId)
  }
  if (options?.status && options.status !== 'all') {
    request = request.eq('status', options.status)
  }
  if (options?.query?.trim()) {
    const q = options.query.trim().replace(/,/g, '')
    request = request.or(`order_number.ilike.%${q}%,recipient_name.ilike.%${q}%,recipient_phone.ilike.%${q}%`)
  }

  const { data, error } = await request
  return throwIfError((data ?? []) as OrderWithRelations[], error, 'Unable to load orders.')
}

export async function fetchOrderById(orderId: string): Promise<OrderWithRelations> {
  const { data, error } = await supabase.from('orders').select(ORDER_DETAIL_SELECT).eq('id', orderId).single()
  const order = throwIfError(data as OrderWithRelations | null, error, 'Unable to load this order.')
  return {
    ...order,
    order_items: [...(order.order_items ?? [])],
    order_events: [...(order.order_events ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
  }
}

export async function fetchSalesSummary(
  siteId: string,
  from: string,
  to: string,
): Promise<{
  order_count: number
  item_count: number
  product_sales: number
  delivery_sales: number
  total_sales: number
}> {
  const { data, error } = await supabase.rpc('sales_summary', {
    p_site_id: siteId,
    p_from: from,
    p_to: to,
  })

  if (error) {
    throw new Error(error.message || 'Unable to load sales totals.')
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    order_count: Number(row?.order_count ?? 0),
    item_count: Number(row?.item_count ?? 0),
    product_sales: Number(row?.product_sales ?? 0),
    delivery_sales: Number(row?.delivery_sales ?? 0),
    total_sales: Number(row?.total_sales ?? 0),
  }
}
