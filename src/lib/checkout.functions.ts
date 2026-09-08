import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createCheckoutOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      fullName: z.string().trim().min(2).max(120),
      phone: z.string().trim().min(9).max(30),
      county: z.string().trim().min(2).max(80),
      address: z.string().trim().min(4).max(300),
      paymentMethod: z.enum(["mpesa", "paystack", "manual"]),
      items: z.array(z.object({
        slug: z.string().min(1).max(120),
        name: z.string().min(1).max(200),
        qty: z.number().int().min(1).max(10),
        variant: z.record(z.string()).optional(),
      })).min(1).max(50),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const slugs = [...new Set(data.items.flatMap((item) => [item.slug, item.slug.split("-")[0]]))];
    const { data: products, error: productsError } = await context.supabase
      .from("products")
      .select("id, slug, price_kes, in_stock, is_published")
      .in("slug", slugs);
    if (productsError) throw new Error("Could not verify the current catalog.");

    const lines = data.items.map((item) => {
      const product = products?.find((row) => row.slug === item.slug) ?? products?.find((row) => row.slug === item.slug.split("-")[0]);
      if (!product || !product.in_stock || !product.is_published) throw new Error(`${item.name} is no longer available.`);
      return { product_id: product.id, product_name: item.name, unit_price_kes: product.price_kes, quantity: item.qty, variant: item.variant ?? {} };
    });
    const totalKes = lines.reduce((sum, line) => sum + line.unit_price_kes * line.quantity, 0);
    const { data: order, error: orderError } = await context.supabase
      .from("orders")
      .insert({ user_id: context.userId, total_kes: totalKes, status: "pending", delivery_status: "preparing", delivery_address: `${data.address}, ${data.county}`, payment_method: data.paymentMethod })
      .select("id, order_number, total_kes")
      .single();
    if (orderError || !order) throw new Error("Could not create your order.");
    const { error: itemsError } = await context.supabase.from("order_items").insert(lines.map((line) => ({ ...line, order_id: order.id })));
    if (itemsError) throw new Error("Could not reserve your items.");
    await context.supabase.from("profiles").upsert({ id: context.userId, full_name: data.fullName, phone: data.phone, county: data.county });
    return { id: order.id, number: order.order_number, totalKes: order.total_kes };
  });