-- Ozow One API full webhooks contain TransactionReference (our order ID),
-- while thin webhooks contain the Ozow transaction ID. Accept either, only after
-- the Edge Function has verified the Svix signature.

BEGIN;

CREATE OR REPLACE FUNCTION public.credit_ozow_refill(
  p_provider_reference TEXT,
  p_event_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.refill_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order
  FROM public.refill_orders
  WHERE provider = 'ozow'
    AND (provider_reference = p_provider_reference OR id::text = p_provider_reference)
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown Ozow payment reference'; END IF;
  IF v_order.status = 'paid' THEN RETURN v_order.id; END IF;
  IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'Refill order is not pending'; END IF;

  UPDATE public.refill_orders SET status = 'paid', paid_at = now() WHERE id = v_order.id;
  INSERT INTO public.point_ledger (
    account_id, entry_type, points_delta, refill_order_id, reference, metadata
  ) VALUES (
    v_order.account_id, 'refill', v_order.points_to_credit, v_order.id, 'ozow:' || v_order.id::text,
    jsonb_build_object('provider', 'ozow', 'event_id', p_event_id)
  );
  UPDATE public.point_accounts
  SET available_points = available_points + v_order.points_to_credit, version = version + 1
  WHERE id = v_order.account_id;
  INSERT INTO public.security_audit_events (rider_id, event_type, metadata)
  VALUES (v_order.rider_id, 'payment.ozow.credited',
    jsonb_build_object('provider_reference', p_provider_reference, 'event_id', p_event_id));
  RETURN v_order.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_ozow_refill(
  p_provider_reference TEXT,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.refill_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order
  FROM public.refill_orders
  WHERE provider = 'ozow'
    AND (provider_reference = p_provider_reference OR id::text = p_provider_reference)
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown Ozow payment reference'; END IF;
  IF v_order.status = 'pending' THEN
    UPDATE public.refill_orders SET status = 'failed' WHERE id = v_order.id;
    INSERT INTO public.security_audit_events (rider_id, event_type, metadata)
    VALUES (v_order.rider_id, 'payment.ozow.failed',
      jsonb_build_object('provider_reference', p_provider_reference, 'reason', left(p_reason, 160)));
  END IF;
  RETURN v_order.id;
END;
$$;

COMMIT;
