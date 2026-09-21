# Ozow One API deployment

This integration uses Ozow **One API** and hosted redirect checkout. The browser never receives an Ozow credential.

## 1. Apply database migrations

Apply in this order:

1. `database/schema.sql`
2. `database/supabase/001_auth_rls.sql`
3. `database/supabase/002_ozow_credit.sql`

The last migration adds server-only, idempotent settlement functions. A duplicate webhook returns the existing paid order rather than crediting points twice.

## 2. Configure public browser values

Copy `js/app-config.example.js` to `js/app-config.js`, then set only:

- `supabaseUrl`
- `supabasePublishableKey`
- `apiBaseUrl` as `https://<project>.supabase.co/functions/v1/rider-api`

The publishable key is intentionally public. Do not put a service-role key, database password, Ozow credential, webhook secret, or transit-card HMAC secret in this file.

## 3. Set Edge Function secrets

Set these using the Supabase dashboard or CLI secret manager:

- `APP_ORIGIN` — exact production site origin, without a trailing slash
- `OZOW_API_BASE_URL` — staging: `https://stagingone.ozow.com/v1`; production: `https://one.ozow.com/v1`
- `OZOW_CLIENT_ID`
- `OZOW_CLIENT_SECRET`
- `OZOW_SITE_CODE`
- `OZOW_WEBHOOK_SECRET` — retrieve from the Ozow webhook subscription
- `SUPABASE_SERVICE_ROLE_KEY` — supplied by Supabase to Edge Functions; never expose it to the browser

Deploy both functions:

- `rider-api`
- `ozow-webhook`

The functions deliberately perform their own authentication: `rider-api` verifies the Supabase access token, while `ozow-webhook` verifies Ozow's Svix signature. This is why both have `verify_jwt = false` in `supabase/config.toml`.

## 4. Configure Supabase Auth

- Enable email confirmation and password-strength rules.
- Add the production `login.html` URL to Supabase Auth redirect URLs.
- Confirm the production site origin exactly matches `APP_ORIGIN`.
- Test with two accounts to confirm RLS prevents cross-rider reads.

## 5. Configure Ozow

In the Ozow dashboard, use a **One API** client and subscribe exactly once to:

- Event: `transaction.complete`
- Delivery URL: `https://<project>.supabase.co/functions/v1/ozow-webhook`
- Message type: `full` or `thin`

Store the subscription secret as `OZOW_WEBHOOK_SECRET`. Never treat the customer's browser return as proof of payment: only a verified webhook may credit points.

## 6. Before production

The API requires an active transit card and points account. Provision or securely link those through the operator's verified card-activation flow before allowing a rider to create a refill. Do not create balances or link cards from browser-provided identifiers.

Run Ozow staging tests for successful, failed, cancelled, delayed, and duplicate webhook deliveries before switching the API base URL to production.

References: [Ozow Redirect Payin](https://hub.ozow.com/integration-methods/apis/payin/redirect-to-ozow/) and [Supabase Edge Functions](https://supabase.com/docs/guides/functions).
