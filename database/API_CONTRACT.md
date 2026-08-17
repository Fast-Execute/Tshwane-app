# Backend API contract

This contract separates the public website from the database. A browser never communicates directly with PostgreSQL and never receives a privileged database credential.

## Authentication

Every rider endpoint requires a bearer token issued by the chosen identity provider. The API verifies its signature, issuer, audience, expiry, and subject before each request.

For each database transaction, the API sets the authenticated subject only for that transaction:

    SET LOCAL app.user_id = '<verified identity-provider subject>';

Do not accept the rider ID from a request body or URL as proof of identity.

## Rider endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /v1/me/points | Return the caller's available points and active card summary |
| GET | /v1/me/ledger?cursor= | Return the caller's own paginated point history |
| POST | /v1/refill-orders | Create a pending refill order; requires an Idempotency-Key header |
| GET | /v1/refill-orders/{id} | Return the caller's own order status |
| POST | /v1/transit-cards | Link a card through a secure, server-side card-verification flow |

The browser may create a pending refill order. It may never write a points balance, ledger entry, payment result, or another rider's record.

## Payment sequence

1. The rider requests a refill order with amount and payment method.
2. The API validates amount limits, creates a pending order, and obtains a hosted checkout session from the payment provider.
3. The browser is redirected to the provider's hosted payment page. Card and bank details go directly to the provider.
4. The provider calls the server-only webhook endpoint.
5. The API verifies the webhook signature and checks provider-reference and idempotency uniqueness.
6. In one database transaction, the API marks the order paid, appends a positive ledger entry, increments the balance using optimistic version checking, and records a privacy-safe audit event.
7. The rider reads the confirmed status from the API.

The redirect page is informational only. It must not credit points; only a verified webhook may do that.

## Webhook endpoint

POST /v1/payment-webhooks/{provider}

Required controls:

- Route is private to the API and protected by the provider signature verification.
- Apply request-size limits and provider-specific replay protection.
- Store only provider reference, outcome, and minimal event metadata.
- Reject duplicate references safely; the same event must never credit points twice.
- Log a request ID and event type, never the raw payment payload.

## Error response shape

    {
      "error": {
        "code": "REFILL_AMOUNT_INVALID",
        "message": "Choose an amount between R10 and R1,000.",
        "requestId": "uuid"
      }
    }

Responses must not reveal whether another rider exists, expose internal SQL errors, or include payment/provider secrets.

## Required backend controls

- TLS, strict CORS allow-list, rate limits, and request size limits
- Input validation at the API boundary
- Structured logs with secret and personal-data redaction
- Database transactions around order/ledger/balance changes
- Automated tests for authorization, row-level security, duplicate webhooks, and insufficient-balance journeys
