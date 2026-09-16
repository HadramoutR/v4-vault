import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Paystack webhook. Marks an order paid once Paystack confirms the charge.
 * Signature: HMAC SHA-512 of the raw body with the secret key.
 */
export const Route = createFileRoute("/api/public/payments/paystack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("Paystack not configured", { status: 503 });

        const body = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const expected = createHmac("sha512", secret).update(body).digest("hex");
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: {
          event?: string;
          data?: { reference?: string; status?: string; amount?: number; currency?: string; metadata?: { order_id?: string } };
        };
        try {
          event = JSON.parse(body) as typeof event;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }
        if (event.event !== "charge.success" || event.data?.status !== "success") {
          return new Response("ignored");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const orderId = event.data.metadata?.order_id;
        const reference = event.data.reference ?? null;
        if (!orderId || !reference || event.data.currency !== "KES") return new Response("ignored");
        const { data: order, error: loadError } = await supabaseAdmin
          .from("orders")
          .select("id, total_kes, status, payment_method, payment_provider_id")
          .eq("id", orderId)
          .maybeSingle();
        if (loadError) return new Response("Provider unavailable", { status: 503 });
        if (!order || order.status !== "pending" || order.payment_method !== "paystack") return new Response("ignored");
        if (order.payment_provider_id && order.payment_provider_id !== reference) return new Response("ignored");
        if (event.data.amount !== order.total_kes * 100) return new Response("ignored");
        const query = supabaseAdmin
          .from("orders")
          .update({ status: "paid", payment_reference: reference, paid_at: new Date().toISOString() });
        const { error } = await query.eq("id", orderId).eq("status", "pending");
        if (error) return new Response("Could not confirm payment", { status: 500 });

        return new Response("ok");
      },
    },
  },
});
