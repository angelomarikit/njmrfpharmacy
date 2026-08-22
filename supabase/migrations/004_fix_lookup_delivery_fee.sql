-- Fix: column reference "destination_region" is ambiguous
-- The function parameter and delivery_rates.destination_region share a name.
-- Run this in the Supabase SQL Editor if checkout still shows that error.

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
