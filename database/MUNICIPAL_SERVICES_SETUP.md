# Municipal services module

The municipal services page is an additive module; it does not replace the existing bus-fare-points demo.

## Page

- Open `municipal-services.html`.
- JavaScript lives in `js/municipal-services.js`.
- It uses Supabase JS v2 from jsDelivr and the existing `js/app-config.js` runtime configuration.
- The project URL is `https://ctadyhreitaekhthqizt.supabase.co`.
- Configure `supabasePublishableKey` with the project's **publishable** key in the deployment configuration. Do not put a service-role key or database password in browser code.

## Features

- Reads active service categories and areas.
- Shows published notices; sample notices are clearly labelled DEMO and must not be treated as real outage information.
- Uses Supabase Auth email/password sign-in and sign-up.
- Authenticated residents can submit non-emergency reports and view their own non-demo cases.
- PostgreSQL RLS is the access-control boundary. UI state is not an authorization mechanism.

## Before deployment

1. Configure the URL and publishable key.
2. Set the Supabase Auth site URL and redirect allow-list for the actual hosting origin.
3. Enable email confirmation and suitable password/rate-limit protections.
4. Test with two separate resident accounts: each should see only their own non-demo cases.
5. Test staff JWT app_metadata roles using a trusted admin process; never let users set their own role.
6. Test uploads, case updates and notices against RLS in a staging project.
7. Publish only after review. This module is not an official City of Tshwane service and has no live municipal outage feed.
