-- Applied to Supabase project ctadyhreitaekhthqizt on 2026-10-26.
-- Additive grant: RLS policies still restrict notice changes to trusted staff/admin JWT roles.
grant insert, delete on public.service_notices to authenticated;
