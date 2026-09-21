import { Webhook } from "npm:svix@1.42.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = { "content-type": "application/json" };

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const webhookSecret = Deno.env.get("OZOW_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("Webhook configuration is incomplete");
    return new Response("Configuration error", { status: 500 });
  }

  const rawBody = await request.text();
  let event: { type: string; data: { id?: string; status?: string; reason?: string | null } };
  try {
    event = new Webhook(webhookSecret).verify(rawBody, {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? ""
    }) as typeof event;
  } catch {
    console.warn("Rejected Ozow webhook with invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  if (event.type !== "transaction.complete" || !event.data.id) {
    return Response.json({ received: true }, { headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const paymentId = event.data.id;
  const status = event.data.status ?? "Error";

  if (status === "Successful") {
    const { error } = await admin.rpc("credit_ozow_refill", {
      p_provider_reference: paymentId,
      p_event_id: request.headers.get("svix-id") ?? paymentId
    });
    if (error) {
      console.error("Ozow settlement failed", { paymentId, code: error.code });
      return new Response("Settlement failed", { status: 500 });
    }
  } else if (status === "Error") {
    const { error } = await admin.rpc("fail_ozow_refill", {
      p_provider_reference: paymentId,
      p_reason: event.data.reason ?? "Ozow payment failed"
    });
    if (error) {
      console.error("Ozow failure update failed", { paymentId, code: error.code });
      return new Response("Order update failed", { status: 500 });
    }
  }

  return Response.json({ received: true }, { headers: corsHeaders });
});
