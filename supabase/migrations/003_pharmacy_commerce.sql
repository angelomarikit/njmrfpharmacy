-- =============================================================================
-- NJMRF Messiah Sanare Pharmacy — commerce schema
-- Run this on the SAME Supabase project as HM Dormitory.
-- Safe to re-run. Does not change HM Dormitory rooms, tenants, or content.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Sites: optional app_kind so landing vs store tenants stay explicit
-- -----------------------------------------------------------------------------

alter table public.sites
  add column if not exists app_kind text not null default 'landing';

alter table public.sites
  drop constraint if exists sites_app_kind_check;

alter table public.sites
  add constraint sites_app_kind_check
  check (app_kind in ('landing', 'store'));

-- -----------------------------------------------------------------------------
-- Pharmacy site
-- -----------------------------------------------------------------------------

insert into public.sites (
  name,
  slug,
  short_description,
  hero_heading,
  hero_subheading,
  phone,
  app_kind,
  is_active
)
values (
  'NJMRF Messiah Sanare Pharmacy',
  'njmrf-pharmacy',
  'Medicines and health products from NJMRF Messiah Sanare Pharmacy.',
  'NJMRF Messiah Sanare Pharmacy',
  'Order medicines online. Pay by QR. We ship via J&T Express.',
  '09457742858',
  'store',
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  phone = excluded.phone,
  app_kind = excluded.app_kind,
  is_active = true;

-- -----------------------------------------------------------------------------
-- Store settings (QR payment, origin for J&T, pickup)
-- -----------------------------------------------------------------------------

create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  payment_qr_url text,
  payment_provider text not null default 'gcash',
  payment_account_name text,
  payment_account_number text,
  payment_instructions text,
  origin_region text not null default 'metro_manila',
  pickup_enabled boolean not null default true,
  delivery_enabled boolean not null default true,
  volumetric_divisor numeric not null default 3500,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_settings_one_per_site unique (site_id),
  constraint store_settings_provider_check
    check (payment_provider in ('gcash', 'maya', 'bank', 'other')),
  constraint store_settings_origin_check
    check (origin_region in ('metro_manila', 'luzon', 'visayas', 'mindanao', 'island'))
);

insert into public.store_settings (
  site_id,
  payment_provider,
  payment_instructions,
  origin_region
)
select
  id,
  'gcash',
  'Send the exact order total to the QR above, then upload a clear screenshot of the payment.',
  'metro_manila'
from public.sites
where slug = 'njmrf-pharmacy'
on conflict (site_id) do nothing;

-- -----------------------------------------------------------------------------
-- Catalog
-- -----------------------------------------------------------------------------

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint product_categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint product_categories_site_slug_unique unique (site_id, slug)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  category_id uuid references public.product_categories (id) on delete set null,
  title text not null,
  slug text not null,
  description text,
  price numeric(12, 2) not null,
  compare_at_price numeric(12, 2),
  sku text,
  barcode text,
  stock_quantity integer not null default 0,
  low_stock_threshold integer not null default 5,
  weight_grams integer not null default 100,
  length_cm numeric(8, 2),
  width_cm numeric(8, 2),
  height_cm numeric(8, 2),
  is_published boolean not null default false,
  is_prescription boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint products_site_slug_unique unique (site_id, slug),
  constraint products_price_non_negative check (price >= 0),
  constraint products_compare_at_non_negative check (compare_at_price is null or compare_at_price >= 0),
  constraint products_stock_non_negative check (stock_quantity >= 0),
  constraint products_weight_positive check (weight_grams > 0)
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

-- -----------------------------------------------------------------------------
-- Customers (separate from site_members — those are admins only)
-- -----------------------------------------------------------------------------

create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customer_profiles_name_not_blank check (length(trim(full_name)) > 0),
  constraint customer_profiles_site_user_unique unique (site_id, user_id)
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  customer_id uuid not null references public.customer_profiles (id) on delete cascade,
  label text,
  recipient_name text not null,
  phone text not null,
  street text not null,
  barangay text,
  city text not null,
  province text not null,
  postal_code text,
  region text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customer_addresses_region_check
    check (region in ('metro_manila', 'luzon', 'visayas', 'mindanao', 'island'))
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  customer_id uuid not null references public.customer_profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cart_items_quantity_positive check (quantity > 0),
  constraint cart_items_customer_product_unique unique (customer_id, product_id)
);

-- -----------------------------------------------------------------------------
-- J&T Express rates (editable in admin; seed is Metro Manila origin)
-- -----------------------------------------------------------------------------

create table if not exists public.delivery_rates (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  destination_region text not null,
  min_weight_grams integer not null,
  max_weight_grams integer not null,
  fee numeric(12, 2) not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint delivery_rates_region_check
    check (destination_region in ('metro_manila', 'luzon', 'visayas', 'mindanao', 'island')),
  constraint delivery_rates_weight_range check (
    min_weight_grams >= 0
    and max_weight_grams >= min_weight_grams
  ),
  constraint delivery_rates_fee_non_negative check (fee >= 0),
  constraint delivery_rates_unique_bracket
    unique (site_id, destination_region, min_weight_grams, max_weight_grams)
);

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  customer_id uuid not null references public.customer_profiles (id) on delete restrict,
  order_number text not null,
  status text not null default 'awaiting_payment',
  fulfillment_type text not null,
  recipient_name text not null,
  recipient_phone text not null,
  street text,
  barangay text,
  city text,
  province text,
  postal_code text,
  region text,
  subtotal numeric(12, 2) not null,
  delivery_fee numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  chargeable_weight_grams integer not null default 0,
  payment_provider text,
  payment_proof_url text,
  payment_reference text,
  paid_at timestamptz,
  stock_restored boolean not null default false,
  tracking_number text,
  admin_notes text,
  customer_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint orders_site_number_unique unique (site_id, order_number),
  constraint orders_status_check check (
    status in (
      'awaiting_payment',
      'payment_submitted',
      'paid',
      'packing',
      'shipped',
      'delivered',
      'cancelled',
      'rejected'
    )
  ),
  constraint orders_fulfillment_check check (fulfillment_type in ('pickup', 'delivery')),
  constraint orders_region_check check (
    region is null
    or region in ('metro_manila', 'luzon', 'visayas', 'mindanao', 'island')
  ),
  constraint orders_amounts_non_negative check (
    subtotal >= 0 and delivery_fee >= 0 and total >= 0
  )
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  title text not null,
  sku text,
  unit_price numeric(12, 2) not null,
  quantity integer not null,
  line_total numeric(12, 2) not null,
  weight_grams integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_amounts_non_negative check (unit_price >= 0 and line_total >= 0)
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index if not exists idx_product_categories_site on public.product_categories (site_id, sort_order);
create index if not exists idx_products_site_published on public.products (site_id, is_published, sort_order);
create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_products_title_search on public.products using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(sku, '')));
create index if not exists idx_product_images_product on public.product_images (product_id, sort_order);
create index if not exists idx_customer_profiles_site_user on public.customer_profiles (site_id, user_id);
create index if not exists idx_customer_addresses_customer on public.customer_addresses (customer_id, is_default);
create index if not exists idx_cart_items_customer on public.cart_items (customer_id);
create index if not exists idx_delivery_rates_lookup on public.delivery_rates (site_id, destination_region, min_weight_grams, max_weight_grams);
create index if not exists idx_orders_site_status on public.orders (site_id, status, created_at desc);
create index if not exists idx_orders_customer on public.orders (customer_id, created_at desc);
create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_order_events_order on public.order_events (order_id, created_at);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

drop trigger if exists trg_store_settings_updated_at on public.store_settings;
create trigger trg_store_settings_updated_at
before update on public.store_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_product_categories_updated_at on public.product_categories;
create trigger trg_product_categories_updated_at
before update on public.product_categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_customer_profiles_updated_at on public.customer_profiles;
create trigger trg_customer_profiles_updated_at
before update on public.customer_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_customer_addresses_updated_at on public.customer_addresses;
create trigger trg_customer_addresses_updated_at
before update on public.customer_addresses
for each row execute function public.set_updated_at();

drop trigger if exists trg_cart_items_updated_at on public.cart_items;
create trigger trg_cart_items_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_delivery_rates_updated_at on public.delivery_rates;
create trigger trg_delivery_rates_updated_at
before update on public.delivery_rates
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.enforce_product_category_site()
returns trigger
language plpgsql
as $$
declare
  category_site uuid;
begin
  if new.category_id is null then
    return new;
  end if;
  select site_id into category_site from public.product_categories where id = new.category_id;
  if category_site is null or category_site <> new.site_id then
    raise exception 'Product category must belong to the same site';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_products_category_site on public.products;
create trigger trg_products_category_site
before insert or update of category_id, site_id on public.products
for each row execute function public.enforce_product_category_site();

create or replace function public.enforce_product_image_site()
returns trigger
language plpgsql
as $$
declare
  product_site uuid;
begin
  select site_id into product_site from public.products where id = new.product_id;
  if product_site is null or product_site <> new.site_id then
    raise exception 'Product image site_id must match the parent product';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_product_images_site on public.product_images;
create trigger trg_product_images_site
before insert or update of product_id, site_id on public.product_images
for each row execute function public.enforce_product_image_site();

-- -----------------------------------------------------------------------------
-- Auth helpers
-- -----------------------------------------------------------------------------

create or replace function public.is_site_customer(target_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_site_id is not null
    and exists (
      select 1
      from public.customer_profiles
      where site_id = target_site_id
        and user_id = auth.uid()
    );
$$;

revoke all on function public.is_site_customer(uuid) from public;
grant execute on function public.is_site_customer(uuid) to authenticated, anon;

-- -----------------------------------------------------------------------------
-- Delivery + checkout functions
-- -----------------------------------------------------------------------------

create or replace function public.chargeable_weight_grams(
  actual_grams integer,
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,
  volumetric_divisor numeric default 3500
)
returns integer
language plpgsql
immutable
as $$
declare
  volumetric integer := 0;
begin
  if length_cm is not null and width_cm is not null and height_cm is not null and volumetric_divisor > 0 then
    volumetric := ceil((length_cm * width_cm * height_cm) / volumetric_divisor * 1000)::int;
  end if;
  return greatest(coalesce(actual_grams, 0), volumetric, 1);
end;
$$;

grant execute on function public.chargeable_weight_grams(integer, numeric, numeric, numeric, numeric) to anon, authenticated;

create or replace function public.lookup_delivery_fee(
  target_site_id uuid,
  destination_region text,
  weight_grams integer
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_fee numeric;
begin
  select dr.fee
  into found_fee
  from public.delivery_rates as dr
  where dr.site_id = target_site_id
    and dr.destination_region = lookup_delivery_fee.destination_region
    and weight_grams >= dr.min_weight_grams
    and weight_grams <= dr.max_weight_grams
  order by dr.max_weight_grams
  limit 1;

  return found_fee;
end;
$$;

grant execute on function public.lookup_delivery_fee(uuid, text, integer) to anon, authenticated;

create or replace function public.next_order_number(target_site_id uuid)
returns text
language plpgsql
as $$
declare
  today text := to_char(timezone('Asia/Manila', now()), 'YYYYMMDD');
  seq integer;
begin
  select count(*) + 1
  into seq
  from public.orders
  where site_id = target_site_id
    and order_number like 'NJM-' || today || '-%';

  return 'NJM-' || today || '-' || lpad(seq::text, 4, '0');
end;
$$;

create or replace function public.place_order(
  p_site_id uuid,
  p_fulfillment_type text,
  p_recipient_name text,
  p_recipient_phone text,
  p_street text default null,
  p_barangay text default null,
  p_city text default null,
  p_province text default null,
  p_postal_code text default null,
  p_region text default null,
  p_customer_notes text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customer_profiles;
  v_settings public.store_settings;
  v_cart record;
  v_subtotal numeric(12, 2) := 0;
  v_weight integer := 0;
  v_delivery numeric(12, 2) := 0;
  v_order public.orders;
  v_item_weight integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to checkout.';
  end if;

  select * into v_customer
  from public.customer_profiles
  where site_id = p_site_id
    and user_id = auth.uid();

  if v_customer.id is null then
    raise exception 'Customer account not found for this store.';
  end if;

  select * into v_settings
  from public.store_settings
  where site_id = p_site_id;

  if v_settings.id is null then
    raise exception 'Store settings are not configured.';
  end if;

  if p_fulfillment_type = 'delivery' then
    if v_settings.delivery_enabled is not true then
      raise exception 'Delivery is not available.';
    end if;
    if p_region is null or p_street is null or p_city is null or p_province is null then
      raise exception 'Delivery address is incomplete.';
    end if;
  elsif p_fulfillment_type = 'pickup' then
    if v_settings.pickup_enabled is not true then
      raise exception 'Store pickup is not available.';
    end if;
  else
    raise exception 'Invalid fulfillment type.';
  end if;

  if not exists (
    select 1 from public.cart_items
    where customer_id = v_customer.id and site_id = p_site_id
  ) then
    raise exception 'Your cart is empty.';
  end if;

  for v_cart in
    select
      c.product_id,
      c.quantity,
      p.title,
      p.sku,
      p.price,
      p.stock_quantity,
      p.is_published,
      p.weight_grams,
      p.length_cm,
      p.width_cm,
      p.height_cm
    from public.cart_items c
    join public.products p on p.id = c.product_id
    where c.customer_id = v_customer.id
      and c.site_id = p_site_id
    for update of p
  loop
    if v_cart.is_published is not true then
      raise exception '% is no longer available.', v_cart.title;
    end if;
    if v_cart.stock_quantity < v_cart.quantity then
      raise exception '% only has % left in stock.', v_cart.title, v_cart.stock_quantity;
    end if;

    v_item_weight := public.chargeable_weight_grams(
      v_cart.weight_grams,
      v_cart.length_cm,
      v_cart.width_cm,
      v_cart.height_cm,
      v_settings.volumetric_divisor
    ) * v_cart.quantity;

    v_subtotal := v_subtotal + (v_cart.price * v_cart.quantity);
    v_weight := v_weight + v_item_weight;
  end loop;

  if p_fulfillment_type = 'delivery' then
    v_delivery := public.lookup_delivery_fee(p_site_id, p_region, v_weight);
    if v_delivery is null then
      raise exception 'No J&T rate found for this destination and weight. Please contact the pharmacy.';
    end if;
  end if;

  insert into public.orders (
    site_id,
    customer_id,
    order_number,
    status,
    fulfillment_type,
    recipient_name,
    recipient_phone,
    street,
    barangay,
    city,
    province,
    postal_code,
    region,
    subtotal,
    delivery_fee,
    total,
    chargeable_weight_grams,
    payment_provider,
    customer_notes
  )
  values (
    p_site_id,
    v_customer.id,
    public.next_order_number(p_site_id),
    'awaiting_payment',
    p_fulfillment_type,
    p_recipient_name,
    p_recipient_phone,
    p_street,
    p_barangay,
    p_city,
    p_province,
    p_postal_code,
    p_region,
    v_subtotal,
    coalesce(v_delivery, 0),
    v_subtotal + coalesce(v_delivery, 0),
    v_weight,
    v_settings.payment_provider,
    p_customer_notes
  )
  returning * into v_order;

  insert into public.order_items (
    site_id,
    order_id,
    product_id,
    title,
    sku,
    unit_price,
    quantity,
    line_total,
    weight_grams
  )
  select
    p_site_id,
    v_order.id,
    c.product_id,
    p.title,
    p.sku,
    p.price,
    c.quantity,
    p.price * c.quantity,
    public.chargeable_weight_grams(
      p.weight_grams,
      p.length_cm,
      p.width_cm,
      p.height_cm,
      v_settings.volumetric_divisor
    )
  from public.cart_items c
  join public.products p on p.id = c.product_id
  where c.customer_id = v_customer.id
    and c.site_id = p_site_id;

  update public.products p
  set stock_quantity = p.stock_quantity - c.quantity
  from public.cart_items c
  where c.customer_id = v_customer.id
    and c.site_id = p_site_id
    and p.id = c.product_id;

  delete from public.cart_items
  where customer_id = v_customer.id
    and site_id = p_site_id;

  insert into public.order_events (site_id, order_id, actor_user_id, event_type, note)
  values (p_site_id, v_order.id, auth.uid(), 'placed', 'Order placed. Waiting for payment screenshot.');

  return v_order;
end;
$$;

grant execute on function public.place_order(uuid, text, text, text, text, text, text, text, text, text, text) to authenticated;

create or replace function public.submit_payment_proof(
  p_order_id uuid,
  p_payment_proof_url text,
  p_payment_reference text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select o.*
  into v_order
  from public.orders o
  join public.customer_profiles c on c.id = o.customer_id
  where o.id = p_order_id
    and c.user_id = auth.uid()
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.status <> 'awaiting_payment' then
    raise exception 'This order is no longer waiting for payment.';
  end if;

  if p_payment_proof_url is null or length(trim(p_payment_proof_url)) = 0 then
    raise exception 'Payment screenshot is required.';
  end if;

  update public.orders
  set
    payment_proof_url = p_payment_proof_url,
    payment_reference = p_payment_reference,
    status = 'payment_submitted'
  where id = v_order.id
  returning * into v_order;

  insert into public.order_events (site_id, order_id, actor_user_id, event_type, note)
  values (v_order.site_id, v_order.id, auth.uid(), 'payment_submitted', 'Customer uploaded a payment screenshot.');

  return v_order;
end;
$$;

grant execute on function public.submit_payment_proof(uuid, text, text) to authenticated;

create or replace function public.set_order_status(
  p_order_id uuid,
  p_status text,
  p_tracking_number text default null,
  p_admin_notes text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if not public.is_site_member(v_order.site_id) then
    raise exception 'Not allowed.';
  end if;

  if p_status not in (
    'awaiting_payment',
    'payment_submitted',
    'paid',
    'packing',
    'shipped',
    'delivered',
    'cancelled',
    'rejected'
  ) then
    raise exception 'Invalid status.';
  end if;

  if p_status in ('cancelled', 'rejected') and v_order.stock_restored is not true then
    update public.products p
    set stock_quantity = p.stock_quantity + i.quantity
    from public.order_items i
    where i.order_id = v_order.id
      and i.product_id = p.id;

    v_order.stock_restored := true;
  end if;

  update public.orders
  set
    status = p_status,
    tracking_number = coalesce(p_tracking_number, tracking_number),
    admin_notes = coalesce(p_admin_notes, admin_notes),
    paid_at = case
      when p_status = 'paid' then coalesce(paid_at, timezone('utc', now()))
      else paid_at
    end,
    stock_restored = v_order.stock_restored
  where id = v_order.id
  returning * into v_order;

  insert into public.order_events (site_id, order_id, actor_user_id, event_type, note)
  values (v_order.site_id, v_order.id, auth.uid(), p_status, p_admin_notes);

  return v_order;
end;
$$;

grant execute on function public.set_order_status(uuid, text, text, text) to authenticated;

create or replace function public.sales_summary(
  p_site_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  order_count bigint,
  item_count bigint,
  product_sales numeric,
  delivery_sales numeric,
  total_sales numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(o.id),
    coalesce((
      select sum(i.quantity)
      from public.order_items i
      where i.order_id = any (array_agg(o.id))
    ), 0),
    coalesce(sum(o.subtotal), 0),
    coalesce(sum(o.delivery_fee), 0),
    coalesce(sum(o.total), 0)
  from public.orders o
  where o.site_id = p_site_id
    and public.is_site_member(p_site_id)
    and o.status in ('paid', 'packing', 'shipped', 'delivered')
    and o.created_at >= p_from
    and o.created_at < p_to;
$$;

grant execute on function public.sales_summary(uuid, timestamptz, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.store_settings enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.cart_items enable row level security;
alter table public.delivery_rates enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

alter table public.store_settings force row level security;
alter table public.product_categories force row level security;
alter table public.products force row level security;
alter table public.product_images force row level security;
alter table public.customer_profiles force row level security;
alter table public.customer_addresses force row level security;
alter table public.cart_items force row level security;
alter table public.delivery_rates force row level security;
alter table public.orders force row level security;
alter table public.order_items force row level security;
alter table public.order_events force row level security;

-- Store settings
drop policy if exists "Public can read store settings" on public.store_settings;
create policy "Public can read store settings"
on public.store_settings
for select
to anon, authenticated
using (
  public.is_site_member(site_id)
  or exists (select 1 from public.sites s where s.id = site_id and s.is_active = true)
);

drop policy if exists "Members can update store settings" on public.store_settings;
create policy "Members can update store settings"
on public.store_settings
for update
to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

-- Categories
drop policy if exists "Public can read active categories" on public.product_categories;
create policy "Public can read active categories"
on public.product_categories
for select
to anon, authenticated
using (
  public.is_site_member(site_id)
  or (
    is_active = true
    and exists (select 1 from public.sites s where s.id = site_id and s.is_active = true)
  )
);

drop policy if exists "Members can insert categories" on public.product_categories;
create policy "Members can insert categories"
on public.product_categories
for insert to authenticated
with check (public.is_site_member(site_id));

drop policy if exists "Members can update categories" on public.product_categories;
create policy "Members can update categories"
on public.product_categories
for update to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

drop policy if exists "Members can delete categories" on public.product_categories;
create policy "Members can delete categories"
on public.product_categories
for delete to authenticated
using (public.is_site_member(site_id));

-- Products
drop policy if exists "Public can read published products" on public.products;
create policy "Public can read published products"
on public.products
for select
to anon, authenticated
using (
  public.is_site_member(site_id)
  or (
    is_published = true
    and exists (select 1 from public.sites s where s.id = site_id and s.is_active = true)
  )
);

drop policy if exists "Members can insert products" on public.products;
create policy "Members can insert products"
on public.products
for insert to authenticated
with check (public.is_site_member(site_id));

drop policy if exists "Members can update products" on public.products;
create policy "Members can update products"
on public.products
for update to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

drop policy if exists "Members can delete products" on public.products;
create policy "Members can delete products"
on public.products
for delete to authenticated
using (public.is_site_member(site_id));

-- Product images
drop policy if exists "Public can read product images" on public.product_images;
create policy "Public can read product images"
on public.product_images
for select
to anon, authenticated
using (
  public.is_site_member(site_id)
  or exists (
    select 1
    from public.products p
    join public.sites s on s.id = p.site_id
    where p.id = product_images.product_id
      and p.is_published = true
      and s.is_active = true
  )
);

drop policy if exists "Members can insert product images" on public.product_images;
create policy "Members can insert product images"
on public.product_images
for insert to authenticated
with check (public.is_site_member(site_id));

drop policy if exists "Members can update product images" on public.product_images;
create policy "Members can update product images"
on public.product_images
for update to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

drop policy if exists "Members can delete product images" on public.product_images;
create policy "Members can delete product images"
on public.product_images
for delete to authenticated
using (public.is_site_member(site_id));

-- Delivery rates
drop policy if exists "Public can read delivery rates" on public.delivery_rates;
create policy "Public can read delivery rates"
on public.delivery_rates
for select
to anon, authenticated
using (
  public.is_site_member(site_id)
  or exists (select 1 from public.sites s where s.id = site_id and s.is_active = true)
);

drop policy if exists "Members can insert delivery rates" on public.delivery_rates;
create policy "Members can insert delivery rates"
on public.delivery_rates
for insert to authenticated
with check (public.is_site_member(site_id));

drop policy if exists "Members can update delivery rates" on public.delivery_rates;
create policy "Members can update delivery rates"
on public.delivery_rates
for update to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

drop policy if exists "Members can delete delivery rates" on public.delivery_rates;
create policy "Members can delete delivery rates"
on public.delivery_rates
for delete to authenticated
using (public.is_site_member(site_id));

-- Customer profiles
drop policy if exists "Customers can read own profile" on public.customer_profiles;
create policy "Customers can read own profile"
on public.customer_profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_site_member(site_id));

drop policy if exists "Customers can insert own profile" on public.customer_profiles;
create policy "Customers can insert own profile"
on public.customer_profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Customers can update own profile" on public.customer_profiles;
create policy "Customers can update own profile"
on public.customer_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Addresses
drop policy if exists "Customers can read own addresses" on public.customer_addresses;
create policy "Customers can read own addresses"
on public.customer_addresses
for select
to authenticated
using (
  public.is_site_member(site_id)
  or exists (
    select 1 from public.customer_profiles c
    where c.id = customer_id and c.user_id = auth.uid()
  )
);

drop policy if exists "Customers can insert own addresses" on public.customer_addresses;
create policy "Customers can insert own addresses"
on public.customer_addresses
for insert
to authenticated
with check (
  exists (
    select 1 from public.customer_profiles c
    where c.id = customer_id and c.user_id = auth.uid() and c.site_id = site_id
  )
);

drop policy if exists "Customers can update own addresses" on public.customer_addresses;
create policy "Customers can update own addresses"
on public.customer_addresses
for update
to authenticated
using (
  exists (
    select 1 from public.customer_profiles c
    where c.id = customer_id and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.customer_profiles c
    where c.id = customer_id and c.user_id = auth.uid() and c.site_id = site_id
  )
);

drop policy if exists "Customers can delete own addresses" on public.customer_addresses;
create policy "Customers can delete own addresses"
on public.customer_addresses
for delete
to authenticated
using (
  exists (
    select 1 from public.customer_profiles c
    where c.id = customer_id and c.user_id = auth.uid()
  )
);

-- Cart
drop policy if exists "Customers can read own cart" on public.cart_items;
create policy "Customers can read own cart"
on public.cart_items
for select
to authenticated
using (
  exists (
    select 1 from public.customer_profiles c
    where c.id = customer_id and c.user_id = auth.uid()
  )
);

drop policy if exists "Customers can insert own cart" on public.cart_items;
create policy "Customers can insert own cart"
on public.cart_items
for insert
to authenticated
with check (
  exists (
    select 1 from public.customer_profiles c
    where c.id = customer_id and c.user_id = auth.uid() and c.site_id = site_id
  )
);

drop policy if exists "Customers can update own cart" on public.cart_items;
create policy "Customers can update own cart"
on public.cart_items
for update
to authenticated
using (
  exists (
    select 1 from public.customer_profiles c
    where c.id = customer_id and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.customer_profiles c
    where c.id = customer_id and c.user_id = auth.uid() and c.site_id = site_id
  )
);

drop policy if exists "Customers can delete own cart" on public.cart_items;
create policy "Customers can delete own cart"
on public.cart_items
for delete
to authenticated
using (
  exists (
    select 1 from public.customer_profiles c
    where c.id = customer_id and c.user_id = auth.uid()
  )
);

-- Orders
drop policy if exists "Customers and members can read orders" on public.orders;
create policy "Customers and members can read orders"
on public.orders
for select
to authenticated
using (
  public.is_site_member(site_id)
  or exists (
    select 1 from public.customer_profiles c
    where c.id = customer_id and c.user_id = auth.uid()
  )
);

drop policy if exists "Members can update orders" on public.orders;
create policy "Members can update orders"
on public.orders
for update
to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

drop policy if exists "Customers and members can read order items" on public.order_items;
create policy "Customers and members can read order items"
on public.order_items
for select
to authenticated
using (
  public.is_site_member(site_id)
  or exists (
    select 1
    from public.orders o
    join public.customer_profiles c on c.id = o.customer_id
    where o.id = order_id and c.user_id = auth.uid()
  )
);

drop policy if exists "Customers and members can read order events" on public.order_events;
create policy "Customers and members can read order events"
on public.order_events
for select
to authenticated
using (
  public.is_site_member(site_id)
  or exists (
    select 1
    from public.orders o
    join public.customer_profiles c on c.id = o.customer_id
    where o.id = order_id and c.user_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

grant select on public.store_settings to anon, authenticated;
grant update on public.store_settings to authenticated;

grant select on public.product_categories to anon, authenticated;
grant insert, update, delete on public.product_categories to authenticated;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;

grant select, insert, update on public.customer_profiles to authenticated;

grant select, insert, update, delete on public.customer_addresses to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;

grant select on public.delivery_rates to anon, authenticated;
grant insert, update, delete on public.delivery_rates to authenticated;

grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.order_events to authenticated;

-- -----------------------------------------------------------------------------
-- Private payment-proof bucket
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-proofs',
  'order-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members and owners can view order proofs" on storage.objects;
create policy "Members and owners can view order proofs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'order-proofs'
  and (
    public.is_site_member(public.storage_site_id(name))
    or name like public.storage_site_id(name)::text || '/customers/' || auth.uid()::text || '/%'
  )
);

drop policy if exists "Customers can upload order proofs" on storage.objects;
create policy "Customers can upload order proofs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'order-proofs'
  and public.is_site_customer(public.storage_site_id(name))
  and name like public.storage_site_id(name)::text || '/customers/' || auth.uid()::text || '/%'
);

drop policy if exists "Members can delete order proofs" on storage.objects;
create policy "Members can delete order proofs"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'order-proofs'
  and public.is_site_member(public.storage_site_id(name))
);

-- -----------------------------------------------------------------------------
-- J&T seed — Metro Manila origin, common published 2025/2026 brackets
-- Confirm with the local J&T branch and edit in Admin → Delivery if needed.
-- -----------------------------------------------------------------------------

insert into public.delivery_rates (site_id, destination_region, min_weight_grams, max_weight_grams, fee)
select s.id, r.destination_region, r.min_weight_grams, r.max_weight_grams, r.fee
from public.sites s
cross join (
  values
    ('metro_manila', 0, 500, 85.00),
    ('metro_manila', 501, 1000, 115.00),
    ('metro_manila', 1001, 3000, 155.00),
    ('metro_manila', 3001, 4000, 225.00),
    ('metro_manila', 4001, 5000, 305.00),
    ('metro_manila', 5001, 6000, 455.00),
    ('luzon', 0, 500, 95.00),
    ('luzon', 501, 1000, 165.00),
    ('luzon', 1001, 3000, 190.00),
    ('luzon', 3001, 4000, 280.00),
    ('luzon', 4001, 5000, 370.00),
    ('luzon', 5001, 6000, 465.00),
    ('visayas', 0, 500, 100.00),
    ('visayas', 501, 1000, 180.00),
    ('visayas', 1001, 3000, 200.00),
    ('visayas', 3001, 4000, 300.00),
    ('visayas', 4001, 5000, 400.00),
    ('visayas', 5001, 6000, 500.00),
    ('mindanao', 0, 500, 105.00),
    ('mindanao', 501, 1000, 195.00),
    ('mindanao', 1001, 3000, 220.00),
    ('mindanao', 3001, 4000, 330.00),
    ('mindanao', 4001, 5000, 440.00),
    ('mindanao', 5001, 6000, 550.00),
    ('island', 0, 500, 115.00),
    ('island', 501, 1000, 205.00),
    ('island', 1001, 3000, 230.00),
    ('island', 3001, 4000, 340.00),
    ('island', 4001, 5000, 450.00),
    ('island', 5001, 6000, 560.00)
) as r(destination_region, min_weight_grams, max_weight_grams, fee)
where s.slug = 'njmrf-pharmacy'
on conflict (site_id, destination_region, min_weight_grams, max_weight_grams) do update
set fee = excluded.fee;
