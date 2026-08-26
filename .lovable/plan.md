# Portable auth, admin, and verified payments

## Goal
Make sign-up, sign-in, account, checkout, and admin routes work when the app is deployed outside Lovable, while ensuring payment status can only be confirmed by verified provider callbacks.

## Implementation

1. **Make the full-stack server portable**
   - Add explicit deployment commands/configuration for Vercel and Node-hosted platforms (Railway and Render), so every URL—including `/auth`, `/account`, `/admin`, server functions, and `/api/public/payments/*`—is handled by the TanStack Start server instead of a static-file host.
   - Keep Vercel’s automatic Nitro target and add a Node-server build/start path for Railway and Render.
   - Document the required public and server-only environment variables and callback URLs without committing secrets.

2. **Make authentication origin-safe**
   - Add a public auth callback route that completes email/OAuth redirects, waits for session hydration, and safely returns users to a same-origin destination.
   - Change email confirmation and Google sign-in to return through that public callback instead of redirecting directly into a protected route.
   - Make the account affordance session-aware and use full sign-out cache cleanup so account/admin state cannot linger after logout.
   - Add profile editing on the account page and retain role-driven access to the admin console.

3. **Secure and connect checkout payments**
   - Replace the current client-side “mark paid” behavior with the existing authenticated server functions for Paystack initialization and M-Pesa STK push.
   - Store provider transaction IDs on orders so callbacks can reliably identify the correct pending order.
   - Keep pay-on-delivery pending for staff confirmation; customers will no longer be able to set their own order to paid.
   - Validate webhook payload shape, provider status, order state, currency, and amount; make updates idempotent and avoid exposing database error details.

4. **Database and access controls**
   - Add the payment-provider identifier needed for reliable callback matching.
   - Narrow the customer order-update policy so payment status, references, and paid timestamps cannot be self-confirmed, while preserving profile management, order history, and staff order controls.

5. **Verification**
   - Test direct navigation to public and protected routes with production-style server output.
   - Test sign-in/account/admin behavior with an authenticated session and verify role access.
   - Exercise webhook failure paths (missing configuration, invalid signature/token, malformed payload, unknown order) and signed success/idempotency paths using isolated test orders when provider secrets are available.
   - Confirm the external-host build artifacts and startup commands for Vercel, Railway, and Render.

## Required deployment configuration
External hosts must provide the same backend URL/publishable key values used by the app. Server-side auth additionally requires the server publishable key, while live webhook processing requires the backend service credential plus the relevant Paystack/M-Pesa credentials. These remain host secrets and will not be added to source control.
