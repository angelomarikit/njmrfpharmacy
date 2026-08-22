# NJMRF Messiah Sanare Pharmacy — Implementation Guide

Sales system for **NJMRF Messiah Sanare Pharmacy**. This is a **new React + TypeScript app** that uses the **same Supabase project** already running HM Dormitory.

HM Dormitory stays a landing-page tenant (`slug = hm-dormitory`). This pharmacy is a second tenant (`slug = njmrf-pharmacy`). Isolation is `site_id` + Row Level Security, not a second database.

Store name: **NJMRF Messiah Sanare Pharmacy**  
Contact: **09457742858**

---

## 1. How the shared database works

The HM Dormitory project already created:

| Existing object | Purpose |
| --- | --- |
| `sites` | One row per client website. Identified by `slug`. |
| `site_members` | Admin / owner / editor users for a site |
| `platform_admins` | Apex super-admin only. Do not put pharmacy staff here. |
| `is_site_member(site_id)` | RLS helper used by every tenant table |
| Storage bucket `site-assets` | Public images. Path must start with `{site_id}/...` |
| Env `VITE_SITE_SLUG` | Tells each deployed frontend which site row to load |

This pharmacy app **reuses** those objects. It **adds** commerce tables. It does **not** reuse `rooms`, `tenants`, `announcements`, or other dormitory tables.

```text
ONE Supabase project
├── sites.slug = hm-dormitory     → HM Dormitory Vite app
└── sites.slug = njmrf-pharmacy   → this pharmacy Vite app
```

Never hardcode a site UUID in the frontend. Always:

1. Read `VITE_SITE_SLUG`
2. Load `sites` where `slug = VITE_SITE_SLUG` and `is_active = true`
3. Use that row’s `id` as `site_id` on every query

---

## 2. Environment variables

Copy `.env.example` to `.env.local`.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SITE_SLUG=njmrf-pharmacy
```

| Variable | Where it comes from | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Same value as HM Dormitory `.env.local` | Supabase → Project Settings → Data API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same value as HM Dormitory | The **anon / publishable** key only |
| `VITE_SITE_SLUG` | `njmrf-pharmacy` | Different from HM Dormitory’s `hm-dormitory` |

Rules:

- Use the **same** URL and publishable key as the dormitory app.
- Change **only** the slug.
- Never put the **service role** key in this frontend, Vercel, or git.
- Vite inlines `VITE_*` at build time. After changing env vars, restart `npm run dev` or redeploy.

TypeScript (`src/vite-env.d.ts`):

```ts
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_SITE_SLUG: string
}
```

---

## 3. Database work (run this first)

Open the **existing** Supabase project used by HM Dormitory.

1. SQL Editor → New query
2. Paste and run **all** of `supabase/migrations/003_pharmacy_commerce.sql`
3. Confirm the new `sites` row:

```sql
select id, name, slug, phone, app_kind, is_active
from public.sites
order by created_at;
```

You should see both `hm-dormitory` and `njmrf-pharmacy`.

4. Confirm new tables exist:

- `store_settings`
- `product_categories`
- `products`
- `product_images`
- `customer_profiles`
- `customer_addresses`
- `cart_items`
- `delivery_rates`
- `orders`
- `order_items`
- `order_events`

5. Confirm Storage buckets:

- `site-assets` (already exists, public) — products, logo, payment QR
- `order-proofs` (new, **private**) — customer payment screenshots

### 3.1 Create the pharmacy admin

1. Authentication → Users → Add user (email + password). Confirm the email.
2. Open `supabase/assign-njmrf-admin.sql`
3. Replace `REPLACE_WITH_ADMIN_EMAIL@example.com`
4. Run it

```sql
insert into public.site_members (site_id, user_id, role)
select s.id, u.id, 'owner'
from public.sites s
join auth.users u on lower(u.email) = lower('REPLACE_WITH_ADMIN_EMAIL@example.com')
where s.slug = 'njmrf-pharmacy'
on conflict (site_id, user_id) do update
set role = excluded.role;
```

Pharmacy admins go in `site_members` for `njmrf-pharmacy` only. They cannot see HM Dormitory data.

### 3.2 Enable customer sign-up

Authentication → Providers → Email:

- Keep email/password enabled
- **Turn on** public sign-up (customers need accounts)
- Admins are still created manually. There is no public “become admin” path.

Customers are **not** inserted into `site_members`. They get a row in `customer_profiles`.

---

## 4. Accounts

Two account types, one Auth system.

| Type | How it is created | Where access is stored | Can do |
| --- | --- | --- | --- |
| Admin | Created in Supabase Dashboard, then assigned with SQL | `site_members` | Products, QR, orders, inventory, reports, J&T rates |
| Customer | Public register / login on the store | `customer_profiles` | Cart, checkout, pay, upload screenshot, view own orders |

After customer registration, the app must insert:

```ts
await supabase.from('customer_profiles').insert({
  site_id: site.id,
  user_id: session.user.id,
  full_name,
  phone,
})
```

Admin login at `/admin` must call `fetchSiteMembership(user.id, site.id)`. If there is no `site_members` row for this slug, sign the user out.

Customer login at `/login` must load `customer_profiles` for this `site_id`. If missing, send them to complete their profile.

A person can be a customer here and an admin on another site. Route by path, not by “they are logged in.”

---

## 5. What to build

Stack: **React + TypeScript + Vite + Tailwind + React Router + Lucide + `@supabase/supabase-js`**. Same stack as HM Dormitory so the two apps stay easy to maintain.

Suggested routes:

| Route | Audience |
| --- | --- |
| `/` | Landing page + featured products |
| `/products` | Catalog, search, category filter |
| `/products/:slug` | Product detail, add to cart |
| `/cart` | Cart |
| `/checkout` | Address / pickup, delivery fee, place order |
| `/orders/:id/pay` | Show QR + exact amount + upload screenshot |
| `/account` | Profile, addresses, order history |
| `/login` `/register` | Customer auth |
| `/admin` | Admin login |
| `/admin/dashboard` | Sales totals, low stock, pending payments |
| `/admin/products` | Shopify-style product list / editor |
| `/admin/orders` | Order inbox and detail |
| `/admin/customers` | Customer records |
| `/admin/delivery` | J&T rate table |
| `/admin/settings` | QR, account name/number, pickup toggle, store info |

---

## 6. Public landing page

Load the `njmrf-pharmacy` site row and published products.

Must show:

- Store name **NJMRF Messiah Sanare Pharmacy**
- Phone **09457742858** (also `tel:09457742858`)
- Hero from `sites.hero_heading`, `hero_subheading`, `hero_image_url`
- Featured / latest published products
- Categories
- Search box that goes to `/products?q=`
- Login / Cart / Shop buttons

Reuse `sites` for logo, address, Facebook, and maps the same way HM Dormitory does. Edit those in **Admin → Settings**.

---

## 7. Shopify-style products (admin)

Keep the product form simple. One screen, not a wizard.

**Fields**

- Title
- Description (rich text or textarea)
- Price
- Compare-at price (optional, for “was ₱X”)
- Images (multiple, drag to reorder)
- Category
- SKU / barcode
- Stock quantity
- Low-stock threshold
- Weight in grams (required for J&T)
- Optional L × W × H in cm (volumetric weight)
- Published toggle
- Prescription flag (optional; if true, show a note at checkout)

**Behavior**

- Auto-build `slug` from title (`Paracetamol 500mg` → `paracetamol-500mg`). Keep it unique per site.
- Upload images to `site-assets` at `{site_id}/products/{product_id}/filename.webp`
- Save product first, then images (need `product_id`)
- Unpublished products are hidden from the storefront
- Admin can still see drafts
- Search admin list by title / SKU
- Filter by category, published, low stock

Stock is the live inventory number. `place_order` decrements it. Cancel / reject restores it.

---

## 8. Cart, checkout, QR payment

### Cart

Signed-in customers use `cart_items` so the cart survives refresh.

Guest users may keep a local cart, but **checkout requires a customer account**. After login, merge local items into `cart_items`.

Do not allow quantity above `products.stock_quantity`.

### Checkout

Customer chooses **Store pickup** or **J&T delivery**.

Delivery requires:

- Recipient name
- Phone
- Street, barangay, city, province
- Region: Metro Manila / Luzon / Visayas / Mindanao / Island
- Optional postal code

Call the database function (do not insert `orders` from the client):

```ts
const { data, error } = await supabase.rpc('place_order', {
  p_site_id: site.id,
  p_fulfillment_type: 'delivery', // or 'pickup'
  p_recipient_name: '...',
  p_recipient_phone: '...',
  p_street: '...',
  p_barangay: '...',
  p_city: '...',
  p_province: '...',
  p_postal_code: '...',
  p_region: 'metro_manila',
  p_customer_notes: '...',
})
```

`place_order` does all of this in one transaction:

1. Confirms the user is a customer of this site
2. Locks product rows
3. Rejects unpublished or out-of-stock items
4. Computes chargeable weight (actual vs volumetric)
5. Looks up J&T fee, or ₱0 for pickup
6. Creates `orders` + `order_items` (price snapshot)
7. Decrements stock
8. Clears the cart
9. Returns the order (`status = awaiting_payment`)

### Pay with QR

Admin Settings stores:

- `payment_qr_url` — image in `site-assets` at `{site_id}/payment/qr.webp`
- `payment_provider` — `gcash` / `maya` / `bank` / `other`
- `payment_account_name`
- `payment_account_number`
- `payment_instructions`

The pay page must show:

1. Order number (example `NJM-20260822-0001`)
2. **Exact total** (products + delivery)
3. The QR image
4. Account name / number
5. File input for a payment screenshot (required)
6. Optional reference number

Upload path for the private bucket:

```text
order-proofs / {site_id}/customers/{user_id}/{order_id}-{filename}
```

Then:

```ts
await supabase.rpc('submit_payment_proof', {
  p_order_id: order.id,
  p_payment_proof_url: uploadedPathOrSignedUrl,
  p_payment_reference: reference || null,
})
```

Status becomes `payment_submitted`. Admin verifies in the order inbox.

Payment proofs are **not** public. Use a signed URL when showing them to the customer or admin.

---

## 9. J&T Express delivery

The pharmacy ships with **J&T Express**. Rates depend on destination region and chargeable weight.

Chargeable weight = the larger of:

- actual weight (sum of `weight_grams * quantity`)
- volumetric weight = `(L × W × H / 3500) × 1000` grams  
  `3500` is the usual J&T PH divisor and is stored in `store_settings.volumetric_divisor`

Seeded rates assume the parcel **originates in Metro Manila**. They are published 2025/2026 consumer rates and **must be confirmed with the local J&T branch**. Edit them in **Admin → Delivery**.

| Weight | Metro Manila | Luzon | Visayas | Mindanao | Island |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0–500 g | ₱85 | ₱95 | ₱100 | ₱105 | ₱115 |
| 501 g–1 kg | ₱115 | ₱165 | ₱180 | ₱195 | ₱205 |
| 1.01–3 kg | ₱155 | ₱190 | ₱200 | ₱220 | ₱230 |
| 3.01–4 kg | ₱225 | ₱280 | ₱300 | ₱330 | ₱340 |
| 4.01–5 kg | ₱305 | ₱370 | ₱400 | ₱440 | ₱450 |
| 5.01–6 kg | ₱455 | ₱465 | ₱500 | ₱550 | ₱560 |

Checkout preview (before placing the order):

```ts
const fee = await supabase.rpc('lookup_delivery_fee', {
  target_site_id: site.id,
  destination_region: 'luzon',
  weight_grams: chargeableGrams,
})
```

If the fee is `null`, the weight is above the table. Block checkout and tell the customer to call **09457742858**.

If the pharmacy is not in Metro Manila, change `store_settings.origin_region` and replace the rate rows. Do not hardcode pesos in React.

---

## 10. Orders (admin)

This is the operations inbox. One row per order, Shopify-like detail page.

**List filters**

- Status
- Date range
- Order number
- Customer name / phone
- Pickup vs delivery

**Statuses**

```text
awaiting_payment
  → payment_submitted   (customer uploaded screenshot)
  → paid                (admin verified the exact amount)
  → packing
  → shipped             (add J&T tracking number)
  → delivered

awaiting_payment / payment_submitted
  → cancelled or rejected   (stock is restored once)
```

Admin status changes must go through:

```ts
await supabase.rpc('set_order_status', {
  p_order_id: order.id,
  p_status: 'paid',
  p_tracking_number: null,
  p_admin_notes: 'GCash screenshot matches ₱430.00',
})
```

Order detail shows:

- Customer name and phone
- Line items with snapshot prices
- Delivery address and J&T fee
- Payment QR metadata + screenshot
- Status timeline from `order_events`
- Tracking number
- Admin notes

---

## 11. Inventory, history, reports

**Inventory**

- Live stock is `products.stock_quantity`
- Sales reduce stock inside `place_order`
- Cancel / reject restores stock inside `set_order_status`
- Dashboard widget: items at or below `low_stock_threshold`
- Admin can also type a new stock number on the product form (physical count)

**Customer / sales history**

- Customer `/account` lists their orders
- Admin `/admin/customers` lists profiles + order count
- Admin `/admin/orders` is the full sales history

**Reports (paid and later only)**

```ts
const { data } = await supabase.rpc('sales_summary', {
  p_site_id: site.id,
  p_from: startIso,
  p_to: endIso,
})
```

Dashboard cards:

- Today
- This week (Monday 00:00 Asia/Manila → now)
- This month

Each card: order count, product sales, delivery fees, total.

Optional later: CSV export of `orders` + `order_items` for a date range.

---

## 12. Storage paths

**Public bucket `site-assets`** (reuse existing policies)

```text
{site_id}/logo/...
{site_id}/hero/...
{site_id}/payment/qr.webp
{site_id}/categories/{category_id}/...
{site_id}/products/{product_id}/...
```

Public visitors can read these. Only `site_members` of that `site_id` can write.

**Private bucket `order-proofs`**

```text
{site_id}/customers/{auth_user_id}/{order_id}-proof.webp
```

Only that customer and pharmacy admins can read. Do not put screenshots in `site-assets`.

JPG / PNG / WebP. Max 5 MB.

---

## 13. App architecture

Mirror HM Dormitory so the two codebases stay familiar.

```text
src/
  lib/env.ts              VITE_SITE_SLUG + Supabase keys
  lib/supabase.ts         createClient(url, publishableKey)
  contexts/SiteContext    fetchSiteBySlug(VITE_SITE_SLUG)
  contexts/AuthContext    session + membership or customer profile
  services/               every Supabase call lives here
  pages/public/
  pages/account/
  pages/admin/
  components/ui/
supabase/migrations/003_pharmacy_commerce.sql
```

`src/lib/env.ts` can be copied from the dormitory project and kept as-is.

Every service function takes `siteId` and filters with `.eq('site_id', siteId)`. Do not rely on the frontend alone; RLS is the real boundary.

---

## 14. Security rules

- Public (anon) can read the active site, published products, categories, delivery rates, and store settings (so checkout can show the QR).
- Public cannot write products, orders, or stock.
- Customers can only read/write their own profile, addresses, cart, and orders.
- Customers cannot change order status except by `submit_payment_proof`.
- Admins must be in `site_members` for `njmrf-pharmacy`.
- An HM Dormitory admin must not see pharmacy orders, and the reverse.
- Payment screenshots stay private.

Tenant isolation check (do this once after the SQL runs):

1. Sign in as the pharmacy admin
2. Confirm you cannot read `rooms` / tenants that belong to `hm-dormitory` from this app (this app should not query those tables at all)
3. Sign in as the HM Dormitory admin and confirm `products` / `orders` for `njmrf-pharmacy` are hidden by RLS

---

## 15. Implementation order

Build in this order so each step is testable.

1. **Database** — run `003_pharmacy_commerce.sql`, assign admin, copy env
2. **Scaffold** — Vite + React + TS + Tailwind + Router + Supabase client + `SiteContext`
3. **Landing + catalog** — published products, search, filters
4. **Admin auth + product editor** — add medicines with images, price, stock
5. **Customer auth** — register, profile, addresses
6. **Cart + checkout + `place_order`**
7. **QR settings + payment screenshot + `submit_payment_proof`**
8. **Admin orders** — verify payment, packing, J&T tracking
9. **Dashboard reports + low stock**
10. **J&T rate editor** — confirm pesos with the branch
11. **Deploy** — second Vercel project, same Supabase keys, `VITE_SITE_SLUG=njmrf-pharmacy`

Do not start from the HM Dormitory repo and try to turn rooms into products. New app, same database.

---

## 16. Production deploy

Same pattern as HM Dormitory, **second Vercel project**:

```env
VITE_SUPABASE_URL=<same as HM Dormitory>
VITE_SUPABASE_PUBLISHABLE_KEY=<same as HM Dormitory>
VITE_SITE_SLUG=njmrf-pharmacy
```

Add `vercel.json` with a SPA rewrite so `/admin` and `/products/:slug` do not 404.

---

## 17. Files in this folder

| File | Use |
| --- | --- |
| `.env.example` | Copy to `.env.local` |
| `supabase/migrations/003_pharmacy_commerce.sql` | Run in the shared Supabase SQL Editor |
| `supabase/assign-njmrf-admin.sql` | Attach the admin Auth user to this slug |
| `IMPLEMENTATION.md` | This guide |

When you are ready to build the app, start with step 2 (scaffold) in this same `NJMRF` folder.
