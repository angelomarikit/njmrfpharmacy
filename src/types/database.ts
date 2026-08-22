export type SiteRole = 'owner' | 'admin' | 'editor'

export type AppKind = 'landing' | 'store'

export type PaymentProvider = 'gcash' | 'maya' | 'bank' | 'other'

export type DeliveryRegion = 'metro_manila' | 'luzon' | 'visayas' | 'mindanao' | 'island'

export type FulfillmentType = 'pickup' | 'delivery'

export type OrderStatus =
  | 'awaiting_payment'
  | 'payment_submitted'
  | 'paid'
  | 'packing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'rejected'

export interface Site {
  id: string
  name: string
  slug: string
  logo_url: string | null
  hero_image_url: string | null
  building_image_url: string | null
  short_description: string | null
  hero_heading: string | null
  hero_subheading: string | null
  address: string | null
  phone: string | null
  email: string | null
  facebook_url: string | null
  messenger_url: string | null
  registration_url: string | null
  google_maps_embed_url: string | null
  google_maps_directions_url: string | null
  is_active: boolean
  app_kind?: AppKind
  created_at: string
  updated_at: string
}

export type SiteUpdate = Partial<
  Pick<
    Site,
    | 'name'
    | 'logo_url'
    | 'hero_image_url'
    | 'short_description'
    | 'hero_heading'
    | 'hero_subheading'
    | 'address'
    | 'phone'
    | 'email'
    | 'facebook_url'
    | 'messenger_url'
  >
>

export interface SiteMember {
  id: string
  site_id: string
  user_id: string
  role: SiteRole
  created_at: string
}

export interface StoreSettings {
  id: string
  site_id: string
  payment_qr_url: string | null
  payment_provider: PaymentProvider
  payment_account_name: string | null
  payment_account_number: string | null
  payment_instructions: string | null
  origin_region: DeliveryRegion
  pickup_enabled: boolean
  delivery_enabled: boolean
  volumetric_divisor: number
  created_at: string
  updated_at: string
}

export type StoreSettingsUpdate = Partial<
  Pick<
    StoreSettings,
    | 'payment_qr_url'
    | 'payment_provider'
    | 'payment_account_name'
    | 'payment_account_number'
    | 'payment_instructions'
    | 'origin_region'
    | 'pickup_enabled'
    | 'delivery_enabled'
    | 'volumetric_divisor'
  >
>

export interface ProductCategory {
  id: string
  site_id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductImage {
  id: string
  site_id: string
  product_id: string
  image_url: string
  alt_text: string | null
  sort_order: number
  created_at: string
}

export interface Product {
  id: string
  site_id: string
  category_id: string | null
  title: string
  slug: string
  description: string | null
  price: number
  compare_at_price: number | null
  sku: string | null
  barcode: string | null
  stock_quantity: number
  low_stock_threshold: number
  weight_grams: number
  length_cm: number | null
  width_cm: number | null
  height_cm: number | null
  is_published: boolean
  is_prescription: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ProductWithRelations extends Product {
  product_images: ProductImage[]
  product_categories: Pick<ProductCategory, 'id' | 'name' | 'slug'> | null
}

export type ProductInput = {
  category_id?: string | null
  title: string
  slug: string
  description?: string | null
  price: number
  compare_at_price?: number | null
  sku?: string | null
  barcode?: string | null
  stock_quantity: number
  low_stock_threshold?: number
  weight_grams: number
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
  is_published?: boolean
  is_prescription?: boolean
  sort_order?: number
}

export interface CustomerProfile {
  id: string
  site_id: string
  user_id: string
  full_name: string
  phone: string | null
  created_at: string
  updated_at: string
}

export interface CustomerAddress {
  id: string
  site_id: string
  customer_id: string
  label: string | null
  recipient_name: string
  phone: string
  street: string
  barangay: string | null
  city: string
  province: string
  postal_code: string | null
  region: DeliveryRegion
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  site_id: string
  customer_id: string
  product_id: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface CartItemWithProduct extends CartItem {
  products: ProductWithRelations | null
}

export interface DeliveryRate {
  id: string
  site_id: string
  destination_region: DeliveryRegion
  min_weight_grams: number
  max_weight_grams: number
  fee: number
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  site_id: string
  customer_id: string
  order_number: string
  status: OrderStatus
  fulfillment_type: FulfillmentType
  recipient_name: string
  recipient_phone: string
  street: string | null
  barangay: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  region: DeliveryRegion | null
  subtotal: number
  delivery_fee: number
  total: number
  chargeable_weight_grams: number
  payment_provider: string | null
  payment_proof_url: string | null
  payment_reference: string | null
  paid_at: string | null
  stock_restored: boolean
  tracking_number: string | null
  admin_notes: string | null
  customer_notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  site_id: string
  order_id: string
  product_id: string | null
  title: string
  sku: string | null
  unit_price: number
  quantity: number
  line_total: number
  weight_grams: number
  created_at: string
}

export interface OrderEvent {
  id: string
  site_id: string
  order_id: string
  actor_user_id: string | null
  event_type: string
  note: string | null
  created_at: string
}

export interface OrderWithRelations extends Order {
  order_items: OrderItem[]
  order_events: OrderEvent[]
  customer_profiles?: Pick<CustomerProfile, 'id' | 'full_name' | 'phone' | 'user_id'> | null
}

export interface SalesSummary {
  order_count: number
  item_count: number
  product_sales: number
  delivery_sales: number
  total_sales: number
}

export const REGION_OPTIONS: Array<{ value: DeliveryRegion; label: string }> = [
  { value: 'metro_manila', label: 'Metro Manila' },
  { value: 'luzon', label: 'Luzon' },
  { value: 'visayas', label: 'Visayas' },
  { value: 'mindanao', label: 'Mindanao' },
  { value: 'island', label: 'Island' },
]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Awaiting payment',
  payment_submitted: 'Payment submitted',
  paid: 'Paid',
  packing: 'Packing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
}

export const PAID_STATUSES: OrderStatus[] = ['paid', 'packing', 'shipped', 'delivered']
