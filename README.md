# NJMRF Messiah Sanare Pharmacy

React + TypeScript storefront and admin for **NJMRF Messiah Sanare Pharmacy**. Uses the same Supabase project as HM Dormitory, isolated by `VITE_SITE_SLUG=njmrf-pharmacy`.

## Run locally

1. Run `supabase/migrations/003_pharmacy_commerce.sql` in the shared Supabase SQL Editor.
2. Create an admin user and run `supabase/assign-njmrf-admin.sql`.
3. Copy `.env.example` to `.env.local` if needed. The slug must stay `njmrf-pharmacy`.
4. Install and start:

```powershell
npm install
npm run dev
```

- Storefront: `/`
- Customer login: `/login`
- Admin: `/admin`

See `IMPLEMENTATION.md` for the full spec, env vars, and database notes.
