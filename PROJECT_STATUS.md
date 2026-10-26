# Project Status — Tshwane Bus Fare Points Refill App

> **Overall completion: 77%**
>
> Last reviewed: 26 October 2026  
> Status: **Interactive demo; backend written and database migrations verified locally, but not yet deployed or connected to the front end**  
> Next milestone: link transit cards, then connect the front end to Supabase Auth and `rider-api`.

## What the percentage means

This percentage measures delivery against the agreed first usable product—not lines of code or time spent.

| Work area | Weight | Current completion | Contribution |
| --- | ---: | ---: | ---: |
| Visual prototype and page structure | 20% | 100% | 20% |
| Front-end foundation and accessibility | 20% | 60% | 12% |
| Core dashboard and refill experience | 30% | 100% | 30% |
| Authentication, payments, and data design | 20% | 75% | 15% |
| Testing, documentation, and release | 10% | 0% | 0% |
| **Total** | **100%** |  | **77%** |

The dashboard and refill journey now form an interactive browser-only demonstration: refills calculate correctly, validate rider input, update the available balance, and create a transaction record in local storage. It does **not** collect card details, authenticate users, or process real payments.

The shared accessibility foundation is partially complete: keyboard-visible focus, reduced-motion support, skip links, clearer navigation labels, and a consistent bus-stop link are in place. Mobile and assistive-technology verification remains before that work area can be closed.

The secure data design is partially complete: a PostgreSQL schema, row-level access rules, append-only points ledger, data-security standard, and API contract are documented in the database directory. A Supabase Auth/RLS migration is now included. Payment-provider selection, sandbox integration, deployment, and security testing remain before real rider data can be accepted.

## Active roadmap

| Priority | Work | Weight | Tracking issue |
| ---: | --- | ---: | --- |
| 1 | Shared styles, scripts, responsive navigation, and accessibility foundation | 20% | [#1](https://github.com/Fast-Execute/Tshwane-app/issues/1) |
| 2 | Working dashboard and fare-points refill journey | 30% | [#2](https://github.com/Fast-Execute/Tshwane-app/issues/2) — completed |
| 3 | Authentication, payment, privacy, and API design | 20% | [#3](https://github.com/Fast-Execute/Tshwane-app/issues/3) |
| 4 | Testing, release documentation, and deployment | 10% | [#4](https://github.com/Fast-Execute/Tshwane-app/issues/4) |

## Tracking rules

1. Every meaningful deliverable belongs to one roadmap work area and has a GitHub issue.
2. Mark work complete only after its acceptance criteria are met and the issue is closed.
3. Update the **Current completion** and **Contribution** values above whenever a work area advances.
4. Calculate the total as the sum of each work area's weighted contribution.
5. Record the review date and next milestone with every update.

## Current focus

Complete [#1](https://github.com/Fast-Execute/Tshwane-app/issues/1) before starting real payment or account integrations. That foundation keeps the demonstration maintainable as it becomes a real product.

## Known gaps (as of 26 October 2026)

- The front end does not call Supabase or `rider-api`; sign-in and refills are browser-only demos and `js/app-config.js` is empty.
- No transit-card linking flow exists. `POST /refill-orders` returns 409 until a rider has an active card and points account, so no real refill can complete.
- `PointsRefill.html` does not read the `?order=` return parameter or show order status; `GET /refill-orders/{id}` is not implemented.
- Backend deployment (Supabase project, Ozow staging, secrets) has not been done, and there are no automated tests or CI.
- Bus-stop coordinates and ratings are hand-entered sample data and should be verified before release.

## Verified on 26 October 2026

`schema.sql` and migrations 001–003 apply cleanly in order on PostgreSQL 16 (with a mock Supabase `auth` schema). Two-rider RLS tests passed: each rider sees only their own rows, anonymous callers see nothing, riders cannot write balances or the ledger or call the settlement functions, and a duplicate Ozow webhook credits points once. This is not a substitute for testing on a real Supabase project.
