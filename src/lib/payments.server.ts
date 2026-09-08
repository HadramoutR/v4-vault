import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function loadOwnPendingOrder(supabase: SupabaseClient<Database>, orderId: string, userId: string) {
  const { data, error } = await supabase.from("orders").select("id, order_number, total_kes, status, user_id").eq("id", orderId).eq("user_id", userId).maybeSingle();
  if (error || !data) throw new Error("Order not found.");
  if (data.status !== "pending") throw new Error("This order is no longer awaiting payment.");
  return data;
}