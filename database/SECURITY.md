# Data security standard

This project handles rider accounts and payment-adjacent information. No design can promise that a breach is impossible; this standard reduces the chance and impact of one, and must be enforced before any real rider data is accepted.

## Data we intentionally do not store

- Passwords or authentication secrets
- Full payment-card numbers, CVVs, card expiry dates, or bank-login details
- Government identification numbers
- Raw physical transit-card identifiers
- Full payment-provider webhook payloads
- Unfiltered request bodies in logs or audit records

Use a dedicated identity provider for sign-in and a PCI-compliant payment provider for checkout. The application receives only a provider reference and payment status after verification.

## Privacy-first model

| Information | Where it belongs | Protection |
| --- | --- | --- |
| Sign-in credential and verified email | Identity provider | Provider-managed authentication and MFA |
| Rider profile | riders table | Minimal fields and row-level security |
| Transit-card lookup value | transit_cards.card_identifier_hmac | One-way server-side HMAC; raw value is never saved |
| Points balance and history | point_accounts and point_ledger | Row-level security and append-only ledger |
| Payment outcome | refill_orders | Provider reference only; idempotency key prevents duplicate crediting |
| Security evidence | security_audit_events | Metadata must not contain personal or payment data |

## Non-negotiable deployment controls

1. Use managed PostgreSQL with encrypted storage, encrypted backups, and private network access.
2. Require TLS for every database connection.
3. Put the database behind a backend API. Browsers must never receive a database password or a privileged key.
4. Use separate migration, API, background-worker, and read-only reporting roles. The application must not connect as an owner or superuser.
5. Enable row-level security and test that one rider cannot read another rider's records.
6. Keep secrets in a managed secret store; rotate them after suspected exposure and at a scheduled interval.
7. Verify payment webhooks using the provider's signature before crediting points. Never trust a browser “payment successful” message.
8. Record security events without logging names, card values, tokens, payment payloads, or request bodies.
9. Limit production access, require MFA for administrators, and review access regularly.
10. Back up securely, test recovery, and document retention/deletion rules consistent with POPIA and applicable law.

## Required checks before production

- [ ] Threat model reviewed for account takeover, payment spoofing, data exposure, and duplicate refills.
- [ ] Independent security review and penetration test completed.
- [ ] Row-level security tests prove cross-rider access is blocked.
- [ ] Rate limits, account lockout, and abuse monitoring are configured.
- [ ] Secure payment-provider integration is verified in its sandbox.
- [ ] Incident response, breach notification, backup recovery, and key-rotation procedures are documented.
- [ ] Privacy notice, lawful basis, retention schedule, and data-subject request process are reviewed with appropriate legal advice.

## Local demo rule

The current browser-only demo may use local storage for fake balances. It must never be used to hold real rider personal data, card information, payment data, or production credentials.
