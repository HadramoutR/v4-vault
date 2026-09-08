# External deployment

The Vault Inc is a full-stack TanStack Start application. Deploy the generated server output, not the static client folder.

## Vercel
- Build command: `bun run build`
- Leave the output directory blank. Nitro detects Vercel and creates `.vercel/output`.
- Add every environment variable listed below.

## Railway or Render
- Build command: `bun run build:node`
- Start command: `bun run start`
- Add every environment variable listed below.

## Environment variables
Authentication requires `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`.

Payments require `PAYSTACK_SECRET_KEY`, plus `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_ENV`, `MPESA_CALLBACK_URL`, and `MPESA_CALLBACK_TOKEN`.

Allow each deployed origin and its `/auth/callback` URL in authentication settings. Paystack should call `/api/public/payments/paystack`; M-Pesa uses `/api/public/payments/mpesa?token=...`.