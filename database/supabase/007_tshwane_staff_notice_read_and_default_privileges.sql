-- Applied to Supabase project ctadyhreitaekhthqizt on 2026-10-26.
-- Staff/admin may inspect drafts and unpublished notices; RLS still relies on
-- the trusted JWT app_metadata.role claim.
drop policy if exists "notices_staff_read_all" on public.service_notices;
create policy "notices_staff_read_all" on public.service_notices
for select to authenticated
using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') in ('staff','admin'));

-- Future public tables created by postgres require explicit grants.
alter default privileges for role postgres in schema public
revoke all on tables from anon, authenticated;
