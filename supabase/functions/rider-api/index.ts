import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const origin = Deno.env.get("APP_ORIGIN") ?? "";
const corsHeaders = {
  "access-control-allow-headers": "authorization, content-type, idempotency-key",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-origin": origin,
  "content-type": "application/json",
  vary: "Origin"
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function centsToRand(cents: number) {
  return Number((cents / 100).toFixed(2));
}

async function ozowAccessToken() {
  const baseUrl = Deno.env.get("OZOW_API_BASE_URL") ?? "https://stagingone.ozow.com/v1";
  const clientId = Deno.env.get("OZOW_CLIENT_ID");
  const clientSecret = Deno.env.get("OZOW_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Ozow credentials are not configured");

  const result = await fetch(`${baseUrl}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "payments",
      grant_type: "client_credentials"
    })
  });
  if (!result.ok) throw new Error("Ozow token request failed");
  const payload = await result.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Ozow did not return an access token");
  return { baseUrl, token: payload.access_token };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!origin || request.headers.get("origin") !== origin) return response({ error: "Origin not allowed" }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return response({ error: "Server configuration error" }, 500);

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return response({ error: "Authentication required" }, 401);

  const token = authorization.slice(7);
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return response({ error: "Invalid or expired session" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: rider, error: riderError } = await admin
    .from("riders")
    .select("id")
    .eq("auth_subject", authData.user.id)
    .single();
  if (riderError || !rider) return response({ error: "Rider profile is not ready" }, 409);

  const path = new URL(request.url).pathname.split("/rider-api")[1] || "/";

  if (request.method === "GET" && path === "/me/points") {
    const { data: cards, error } = await admin
      .from("transit_cards")
      .select("id, card_last_four, point_accounts(id, available_points)")
      .eq("rider_id", rider.id)
      .eq("status", "active");
    if (error) return response({ error: "Unable to read points" }, 500);
    const accounts = (cards ?? []).flatMap((card: any) =>
      (card.point_accounts ?? []).map((account: any) => ({
        accountId: account.id,
        availablePoints: account.available_points,
        cardLastFour: card.card_last_four
      }))
    );
    return response({ accounts });
  }

  if (request.method === "GET" && path === "/me/ledger") {
    const { data: cards } = await admin.from("transit_cards").select("id, point_accounts(id)").eq("rider_id", rider.id);
    const accountIds = (cards ?? []).flatMap((card: any) => (card.point_accounts ?? []).map((a: any) => a.id));
    if (!accountIds.length) return response({ entries: [] });
    const { data, error } = await admin
      .from("point_ledger")
      .select("reference, points_delta, entry_type, created_at")
      .in("account_id", accountIds)
      .order("created_at", { ascending: false })
      .limit(50);
    return error ? response({ error: "Unable to read ledger" }, 500) : response({ entries: data });
  }

  if (request.method === "POST" && path === "/refill-orders") {
    const idempotencyKey = request.headers.get("idempotency-key");
    const body = await request.json().catch(() => null) as { amountCents?: number } | null;
    const amountCents = body?.amountCents;
    if (!idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(idempotencyKey)) {
      return response({ error: "A UUID Idempotency-Key is required" }, 400);
    }
    if (!Number.isInteger(amountCents) || amountCents < 1000 || amountCents > 100000) {
      return response({ error: "Choose an amount between R10 and R1,000" }, 400);
    }

    const { data: card } = await admin
      .from("transit_cards")
      .select("id")
      .eq("rider_id", rider.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!card) return response({ error: "An active transit card must be linked before refilling" }, 409);

    const { data: account } = await admin
      .from("point_accounts")
      .select("id")
      .eq("card_id", card.id)
      .maybeSingle();
    if (!account) return response({ error: "No points account is linked to this transit card" }, 409);

    const { data: existing } = await admin
      .from("refill_orders")
      .select("id, provider_reference, status")
      .eq("rider_id", rider.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existing?.provider_reference) return response({ orderId: existing.id, status: existing.status }, 200);

    const { data: order, error: orderError } = await admin
      .from("refill_orders")
      .insert({
        rider_id: rider.id,
        account_id: account.id,
        amount_cents: amountCents,
        points_to_credit: Math.round(centsToRand(amountCents) * 10),
        idempotency_key: idempotencyKey,
        provider: "ozow"
      })
      .select("id, expires_at")
      .single();
    if (orderError || !order) return response({ error: "Unable to create refill order" }, 500);

    try {
      const { baseUrl, token: ozowToken } = await ozowAccessToken();
      const ozow = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { authorization: `Bearer ${ozowToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          siteCode: Deno.env.get("OZOW_SITE_CODE"),
          region: "ZA",
          amount: { currency: "ZAR", value: centsToRand(amountCents) },
          merchantReference: order.id,
          beneficiaryReference: order.id.replaceAll("-", "").slice(0, 20),
          expireAt: order.expires_at,
          returnUrl: `${origin}/PointsRefill.html?order=${order.id}`
        })
      });
      const payment = await ozow.json() as { id?: string; redirectUrl?: string };
      if (!ozow.ok || !payment.id || !payment.redirectUrl) throw new Error("Ozow payment request failed");

      const { error: updateError } = await admin
        .from("refill_orders")
        .update({ provider_reference: payment.id })
        .eq("id", order.id);
      if (updateError) throw updateError;
      return response({ orderId: order.id, checkoutUrl: payment.redirectUrl }, 201);
    } catch (error) {
      await admin.from("refill_orders").update({ status: "failed" }).eq("id", order.id);
      console.error("Ozow checkout creation failed", { orderId: order.id });
      return response({ error: "Unable to start Ozow checkout" }, 502);
    }
  }

  return response({ error: "Not found" }, 404);
});
