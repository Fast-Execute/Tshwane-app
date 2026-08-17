# Supabase production deployment

Supabase is the selected managed PostgreSQL and authentication platform for this application. Its Auth and PostgreSQL Row Level Security controls support the privacy-first schema, but the project is not ready to accept real riders until every item below is complete.

## Before connecting the website

1. Create a dedicated Supabase project in an approved data region and enable encrypted backups.
2. Turn on email confirmation, password-strength rules, rate limits, bot protection, and MFA for administrator accounts.
3. Store the project URL and publishable key only in deployment environment settings. Never commit a service-role key, database password, HMAC secret, or payment secret.
4. Run the schema migration through a restricted migration role.
5. Create an auth-user trigger that creates a minimal rider profile after verified sign-up.
6. Configure the production site URL and an explicit redirect allow-list.
7. Use an Edge Function or separate backend for payment order creation and webhook verification. Keep provider secrets there, never in the browser.
8. Test every row-level policy with two separate rider accounts before launch.
9. Complete the checks in SECURITY.md, including independent security review and recovery testing.

## Authentication rules

- Email/password registration must be handled by Supabase Auth, not by an app table.
- Supabase Auth owns password hashing, password resets, email verification, and session tokens.
- The public website may use only a publishable key. The service-role key must remain server-side.
- Do not place sensitive profile fields, payment details, or transit-card values in user metadata or browser storage.

## Required architecture

    Browser
      -> Supabase Auth (registration and login)
      -> protected API or Edge Function
      -> PostgreSQL with Row Level Security
      -> payment provider hosted checkout

The payment provider calls a server-only webhook. The webhook verifies the provider signature, then credits the ledger in one transaction. A client-side success page can never credit points.

## Current demo limitation

The current register and login screens demonstrate the intended rider journey only. They do not create Supabase users, verify emails, or process real payments. Connect Supabase only after its project credentials are available through secure deployment settings.
