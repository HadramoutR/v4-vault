import { createFileRoute } from "@tanstack/react-router";

/**
 * Safaricom Daraja STK callback. Daraja does not sign its callbacks, so the
 * URL carries a shared token (`?token=…`) that must match MPESA_CALLBACK_TOKEN.
 */
export const Route = createFileRoute("/api/public/payments/mpesa")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.MPESA_CALLBACK_TOKEN;
        if (!token) return new Response("M-Pesa not configured", { status: 503 });

        const url = new URL(request.url);
        if (url.searchParams.get("token") !== token) {
          return new Response("Invalid token", { status: 401 });
        }

        let payload: {
          Body?: {
            stkCallback?: {
              ResultCode?: number;
              CheckoutRequestID?: string;
              CallbackMetadata?: { Item?: { Name: string; Value?: string | number }[] };
            };
          };
        };
        try {
          payload = (await request.json()) as typeof payload;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }
        const callback = payload.Body?.stkCallback;
        if (!callback || callback.ResultCode !== 0) {
          return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const items = callback.CallbackMetadata?.Item ?? [];
        const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;
        const checkoutRequestId = callback.CheckoutRequestID;
        if (checkoutRequestId) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin
            .from("orders")
            .update({
              status: "paid",
              payment_reference: receipt ? String(receipt) : null,
              paid_at: new Date().toISOString(),
            })
            .eq("payment_provider_id", checkoutRequestId)
            .eq("status", "pending")
            .eq("payment_method", "mpesa");
          if (error) console.error("M-Pesa callback update failed", error.message);
        }

        return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
