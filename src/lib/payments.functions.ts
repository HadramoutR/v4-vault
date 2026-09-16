import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeMsisdn, toKoboMinorUnits } from "@/lib/payments";
import { loadOwnPendingOrder } from "@/lib/payments.server";

/**
 * Payment rail foundations. Both handlers verify the caller owns the order,
 * then hand off to the provider. Credentials are read at call time so the
 * app boots fine before they're configured.
 */

type InitInput = { orderId: string; callbackUrl?: string; phone?: string };

const validateInit = (data: InitInput) => {
  if (!data?.orderId) throw new Error("orderId is required");
  return data;
};

/** Paystack: create a hosted checkout session for the order. */
export const initPaystackCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateInit)
  .handler(async ({ data, context }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return { configured: false as const, reason: "Paystack is not connected yet." };
    }

    const order = await loadOwnPendingOrder(context.supabase, data.orderId, context.userId);
    const email = (context.claims?.email as string | undefined) ?? "customer@thevault.co.ke";

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: toKoboMinorUnits(order.total_kes),
        currency: "KES",
        reference: order.order_number,
        callback_url: data.callbackUrl,
        metadata: { order_id: order.id },
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error("Paystack initialization failed", res.status, body);
      throw new Error("Paystack could not start checkout. Please try again.");
    }
    const json = JSON.parse(body) as { data?: { authorization_url?: string; reference?: string } };
    const reference = json.data?.reference ?? order.order_number;
    const { error: referenceError } = await context.supabase
      .from("orders")
      .update({ payment_provider_id: reference } as never)
      .eq("id", order.id)
      .eq("user_id", context.userId);
    if (referenceError) throw new Error("Could not save the payment session.");
    return {
      configured: true as const,
      authorizationUrl: json.data?.authorization_url ?? null,
      reference,
    };
  });

/** M-Pesa direct: Daraja STK push against the business short code. */
export const initMpesaStkPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateInit)
  .handler(async ({ data, context }) => {
    const key = process.env.MPESA_CONSUMER_KEY;
    const secretKey = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL ?? data.callbackUrl;
    const env = process.env.MPESA_ENV === "production" ? "api" : "sandbox";

    if (!key || !secretKey || !shortCode || !passkey || !callbackUrl) {
      return { configured: false as const, reason: "M-Pesa direct is not connected yet." };
    }

    const msisdn = normalizeMsisdn(data.phone ?? "");
    if (!msisdn) throw new Error("Enter a valid Safaricom number, e.g. 0712 345 678.");

    const order = await loadOwnPendingOrder(context.supabase, data.orderId, context.userId);

    const tokenRes = await fetch(
      `https://${env}.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${btoa(`${key}:${secretKey}`)}` } },
    );
    const tokenBody = await tokenRes.text();
    if (!tokenRes.ok) {
      console.error("M-Pesa authentication failed", tokenRes.status, tokenBody);
      throw new Error("M-Pesa could not start checkout. Please try again.");
    }
    const { access_token: token } = JSON.parse(tokenBody) as { access_token: string };

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(
      now.getUTCHours(),
    )}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;

    const res = await fetch(`https://${env}.safaricom.co.ke/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortCode,
        Password: btoa(`${shortCode}${passkey}${timestamp}`),
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.max(1, Math.round(order.total_kes)),
        PartyA: msisdn,
        PartyB: shortCode,
        PhoneNumber: msisdn,
        CallBackURL: callbackUrl,
        AccountReference: order.order_number,
        TransactionDesc: `The Vault Inc ${order.order_number}`,
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error("M-Pesa STK push failed", res.status, body);
      throw new Error("M-Pesa could not send the prompt. Please try again.");
    }
    const json = JSON.parse(body) as { CheckoutRequestID?: string; CustomerMessage?: string };
    if (!json.CheckoutRequestID) throw new Error("M-Pesa did not return a checkout reference.");
    const { error: referenceError } = await context.supabase
      .from("orders")
      .update({ payment_provider_id: json.CheckoutRequestID } as never)
      .eq("id", order.id)
      .eq("user_id", context.userId);
    if (referenceError) throw new Error("Could not save the M-Pesa payment session.");
    return {
      configured: true as const,
      checkoutRequestId: json.CheckoutRequestID ?? null,
      message: json.CustomerMessage ?? "Check your phone to approve the payment.",
    };
  });
