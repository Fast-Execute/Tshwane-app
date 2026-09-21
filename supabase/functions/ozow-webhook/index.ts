import { Webhook } from "npm:svix@1.42.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const jsonHeaders = { "content-type": "application/json" };

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const webhookSecret = Deno.env.get("OZOW_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) return new Response("Configuration error", { status: 500 });

  const rawBody = await request.text();
  type WebhookData = {
    id?: string; status?: string; reason?: string | null;
    TransactionReference?: string; Status?: string; StatusMessage?: string;
  };
  let event: { type: string; data: WebhookData };
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

  // A full message carries our merchant reference; a thin message carries only
  // Ozow's transaction ID. The settlement migration safely accepts either.
  const reference = event.data.TransactionReference ?? event.data.id;
  const status = event.data.Status ?? event.data.status ?? "Error";
  if (event.type !== "transaction.complete" || !reference) {
    return Response.json({ received: true }, { headers: jsonHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const eventId = request.headers.get("svix-id") ?? reference;
  const result = status === "Successful"
    ? await admin.rpc("credit_ozow_refill", { p_provider_reference: reference, p_event_id: eventId })
    : status === "Error"
      ? await admin.rpc("fail_ozow_refill", {
          p_provider_reference: reference,
          p_reason: event.data.StatusMessage ?? event.data.reason ?? "Ozow payment failed"
        })
      : { error: null };

  if (result.error) {
    console.error("Ozow webhook processing failed", { code: result.error.code });
    return new Response("Webhook processing failed", { status: 500 });
  }
  return Response.json({ received: true }, { headers: jsonHeaders });
});
