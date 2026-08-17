-- Supabase migration: connect the privacy-first schema to Supabase Auth.
-- Run schema.sql first. Review in a staging project before production.
-- This migration intentionally creates only a minimal rider profile.

BEGIN;

ALTER TABLE public.riders
  ADD CONSTRAINT riders_auth_subject_fkey
  FOREIGN KEY (auth_subject) REFERENCES auth.users(id) ON DELETE RESTRICT;

-- A verified Supabase user receives an empty, minimal rider record.
-- Keep personal details out of raw_user_meta_data; collect only justified
-- profile data through a separately reviewed API flow.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.riders (auth_subject)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Existing RLS policies use app_current_rider_id(). Replacing this helper
-- connects them to the authenticated Supabase user instead of a client-set
-- request value. auth.uid() is null for unauthenticated requests.
CREATE OR REPLACE FUNCTION public.app_current_rider_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
  SELECT id
  FROM public.riders
  WHERE auth_subject = auth.uid()
$$;

-- Browser clients receive only the minimum permissions needed. RLS policies
-- remain the enforcement layer; no update/delete is granted for balances,
-- ledger entries, or refill order payment state.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT SELECT ON public.riders, public.transit_cards, public.point_accounts,
  public.refill_orders, public.point_ledger TO authenticated;
GRANT INSERT ON public.refill_orders TO authenticated;

-- The payment webhook must use a server-only Edge Function or backend with
-- its secret stored outside the browser. Do not grant its privileges here.

COMMIT;
