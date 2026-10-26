-- Applied to Supabase project ctadyhreitaekhthqizt on 2026-10-26.
-- Revoke broad default privileges from anon/authenticated on the six municipal
-- tables, then grant only the table/column operations expected by the RLS rules.
revoke all privileges on table
  public.profiles,
  public.service_categories,
  public.service_areas,
  public.service_requests,
  public.service_request_updates,
  public.service_notices
from anon, authenticated;

grant select on public.service_categories, public.service_areas to anon, authenticated;
grant select on public.service_notices to anon, authenticated;
grant insert, update, delete on public.service_notices to authenticated;
grant select on public.profiles, public.service_requests, public.service_request_updates to authenticated;
grant insert on public.service_requests, public.service_request_updates to authenticated;
grant update on public.service_requests to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
