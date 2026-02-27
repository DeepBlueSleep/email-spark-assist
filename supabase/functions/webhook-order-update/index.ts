import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    if (webhookSecret) {
      const providedSecret = req.headers.get("x-webhook-secret");
      if (providedSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();

    await supabase.from("webhook_logs").insert({
      endpoint: "webhook-order-update",
      payload,
    });

    // Expects: { email_id or external_id, status?, order_items[] }
    const emailId = payload.email_id;
    const externalId = payload.external_id;

    let query = supabase.from("emails").select("id");
    if (emailId) {
      query = query.eq("id", emailId);
    } else if (externalId) {
      query = query.eq("external_id", externalId);
    } else {
      return new Response(
        JSON.stringify({ error: "email_id or external_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: emailRecord, error: findError } = await query.single();
    if (findError || !emailRecord) {
      return new Response(
        JSON.stringify({ error: "Email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dbEmailId = emailRecord.id;

    // Update email status if provided
    if (payload.status) {
      await supabase.from("emails").update({ status: payload.status }).eq("id", dbEmailId);
    }

    // Replace order items if provided
    if (payload.order_items?.length > 0) {
      await supabase.from("order_items").delete().eq("email_id", dbEmailId);
      const items = payload.order_items.map((item: any) => ({
        email_id: dbEmailId,
        item_code: item.item_code,
        item_name: item.item_name,
        quantity: item.quantity || 1,
        unit: item.unit || "units",
        delivery_date: item.delivery_date || "",
        delivery_address: item.delivery_address || "",
        remarks: item.remarks || "",
      }));
      const { error } = await supabase.from("order_items").insert(items);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ success: true, email_id: dbEmailId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Order update webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
