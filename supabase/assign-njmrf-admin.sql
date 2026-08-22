-- Assign an existing Auth user as NJMRF Messiah Sanare Pharmacy owner.
-- 1. Create the user first: Authentication → Users → Add user
-- 2. Replace the email below with that user's email
-- 3. Run this after 003_pharmacy_commerce.sql

insert into public.site_members (
  site_id,
  user_id,
  role
)
select
  s.id,
  u.id,
  'owner'
from public.sites s
join auth.users u
  on lower(u.email) = lower('REPLACE_WITH_ADMIN_EMAIL@example.com')
where s.slug = 'njmrf-pharmacy'
on conflict (site_id, user_id) do update
set role = excluded.role;
