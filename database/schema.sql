-- Tshwane Bus Points: privacy-first PostgreSQL schema
-- Deploy only through a restricted migration account. The application API must
-- connect with a non-owner role and set app.user_id for each authenticated request.
-- Never expose the database password or a service credential to a browser.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE refill_status AS ENUM ('pending', 'paid', 'failed', 'cancelled');
CREATE TYPE ledger_entry_type AS ENUM ('refill', 'journey', 'adjustment', 'reversal');

-- Authentication is handled by a dedicated identity provider. This table stores
-- only the provider subject; do not store passwords, ID numbers, or raw contact data.
CREATE TABLE riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject UUID NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT riders_display_name_length CHECK (
    display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 80
  )
);

-- Store a one-way HMAC of the physical-card identifier. Searching a card is
-- performed by the API with the same server-held HMAC secret; raw identifiers
-- must never be stored or returned to the client.
CREATE TABLE transit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES riders(id) ON DELETE RESTRICT,
  card_identifier_hmac BYTEA NOT NULL UNIQUE,
  card_last_four CHAR(4),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'replaced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deactivated_at TIMESTAMPTZ,
  CONSTRAINT cards_last_four_digits CHECK (card_last_four IS NULL OR card_last_four ~ '^[0-9]{4}$')
);

CREATE TABLE point_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL UNIQUE REFERENCES transit_cards(id) ON DELETE RESTRICT,
  available_points BIGINT NOT NULL DEFAULT 0 CHECK (available_points >= 0),
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refill_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES riders(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES point_accounts(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents BETWEEN 1000 AND 100000),
  points_to_credit BIGINT NOT NULL CHECK (points_to_credit > 0),
  currency CHAR(3) NOT NULL DEFAULT 'ZAR' CHECK (currency = 'ZAR'),
  status refill_status NOT NULL DEFAULT 'pending',
  idempotency_key UUID NOT NULL,
  provider TEXT,
  provider_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '20 minutes',
  CONSTRAINT refill_orders_idempotency UNIQUE (rider_id, idempotency_key),
  CONSTRAINT refill_orders_provider_reference UNIQUE (provider, provider_reference),
  CONSTRAINT paid_orders_have_timestamp CHECK (
    (status <> 'paid') OR paid_at IS NOT NULL
  )
);

-- Append-only financial record. Do not update or delete ledger rows: corrections
-- are recorded as a new reversal or adjustment entry with a complete audit trail.
CREATE TABLE point_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES point_accounts(id) ON DELETE RESTRICT,
  entry_type ledger_entry_type NOT NULL,
  points_delta BIGINT NOT NULL CHECK (points_delta <> 0),
  refill_order_id UUID UNIQUE REFERENCES refill_orders(id) ON DELETE RESTRICT,
  reference TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT refill_entries_match_orders CHECK (
    (entry_type = 'refill' AND refill_order_id IS NOT NULL) OR
    (entry_type <> 'refill')
  )
);

-- Store operational evidence only. Do not put names, emails, raw card identifiers,
-- payment payloads, tokens, or request bodies in audit metadata.
CREATE TABLE security_audit_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rider_id UUID REFERENCES riders(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type ~ '^[a-z0-9_.-]{3,80}$'),
  request_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX transit_cards_rider_id_idx ON transit_cards(rider_id);
CREATE INDEX refill_orders_rider_created_idx ON refill_orders(rider_id, created_at DESC);
CREATE INDEX refill_orders_pending_idx ON refill_orders(expires_at) WHERE status = 'pending';
CREATE INDEX point_ledger_account_created_idx ON point_ledger(account_id, created_at DESC);
CREATE INDEX security_audit_events_rider_time_idx ON security_audit_events(rider_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION app_current_rider_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT r.id
  FROM riders r
  WHERE r.auth_subject = NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_auth_subject_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $
BEGIN
  IF NEW.auth_subject <> OLD.auth_subject THEN
    RAISE EXCEPTION 'auth_subject cannot be changed';
  END IF;
  RETURN NEW;
END;
$;

CREATE TRIGGER riders_touch_updated_at
BEFORE UPDATE ON riders
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER riders_prevent_auth_subject_change
BEFORE UPDATE ON riders
FOR EACH ROW EXECUTE FUNCTION prevent_auth_subject_change();

CREATE TRIGGER point_accounts_touch_updated_at
BEFORE UPDATE ON point_accounts
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- All tables are deny-by-default. The API may set app.user_id after verifying
-- the identity-provider token; database owners and migration roles must not
-- be used by the web application.
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE refill_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY rider_can_read_self ON riders
  FOR SELECT USING (id = app_current_rider_id());

CREATE POLICY rider_can_update_safe_profile_fields ON riders
  FOR UPDATE USING (id = app_current_rider_id())
  WITH CHECK (id = app_current_rider_id());

CREATE POLICY rider_can_read_own_cards ON transit_cards
  FOR SELECT USING (rider_id = app_current_rider_id());

CREATE POLICY rider_can_read_own_accounts ON point_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transit_cards c
      WHERE c.id = point_accounts.card_id
        AND c.rider_id = app_current_rider_id()
    )
  );

CREATE POLICY rider_can_read_own_refills ON refill_orders
  FOR SELECT USING (rider_id = app_current_rider_id());

CREATE POLICY rider_can_create_own_pending_refills ON refill_orders
  FOR INSERT WITH CHECK (
    rider_id = app_current_rider_id()
    AND status = 'pending'
    AND provider_reference IS NULL
    AND paid_at IS NULL
  );

CREATE POLICY rider_can_read_own_ledger ON point_ledger
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM point_accounts a
      JOIN transit_cards c ON c.id = a.card_id
      WHERE a.id = point_ledger.account_id
        AND c.rider_id = app_current_rider_id()
    )
  );

-- A rider must never write the ledger, adjust balances, or mark a refill paid.
-- Those actions are allowed only through an API-only transaction after a verified
-- payment-provider webhook. Configure role grants separately:
--   REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
--   GRANT SELECT, INSERT ON refill_orders TO tshwane_api;
--   GRANT SELECT ON riders, transit_cards, point_accounts, point_ledger TO tshwane_api;
--   GRANT INSERT ON security_audit_events TO tshwane_api;
--   GRANT USAGE ON SCHEMA public TO tshwane_api;
-- Do not grant UPDATE or DELETE on point_accounts, point_ledger, or refill_orders
-- to the browser-facing role.

COMMIT;
