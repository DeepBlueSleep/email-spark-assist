import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // Optional: verify webhook secret
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

    // Log the webhook
    await supabase.from("webhook_logs").insert({
      endpoint: "webhook-email",
      payload,
    });

    // Support single or batch emails
    const emails = Array.isArray(payload) ? payload : [payload];

    const results = [];

    for (const emailData of emails) {
      // Insert the email
      const { data: email, error: emailError } = await supabase
        .from("emails")
        .upsert(
          {
            external_id:
              emailData.external_id ||
              emailData.message_id ||
              emailData["message-id"] ||
              emailData.id ||
              crypto.randomUUID(),
            customer_name,
            email: customer_email,
            subject: emailData.subject,
            body,
            timestamp: emailData.timestamp || new Date().toISOString(),
            sentiment: emailData.sentiment || "Neutral",
            sentiment_confidence: emailData.sentiment_confidence || 0,
            intent: emailData.intent || "General Question",
            intent_confidence: emailData.intent_confidence || 0,
            ai_reply_draft: emailData.ai_reply_draft || "",
            status: emailData.status || "New",
            attachments: emailData.attachments || [],
          },
          { onConflict: "external_id" },
        )
        .select()
        .single();

      if (emailError) throw emailError;

      // Insert order items if provided
      if (emailData.extracted_order?.length > 0) {
        const orderItems = emailData.extracted_order.map((item: any) => ({
          email_id: email.id,
          item_code: item.item_code,
          item_name: item.item_name,
          quantity: item.quantity || 1,
          unit: item.unit || "units",
          delivery_date: item.delivery_date || "",
          delivery_address: item.delivery_address || "",
          remarks: item.remarks || "",
        }));

        const { error: orderError } = await supabase.from("order_items").insert(orderItems);
        if (orderError) throw orderError;
      }

      // Insert recommended SKUs if provided
      if (emailData.recommended_skus?.length > 0) {
        const skus = emailData.recommended_skus.map((sku: any) => ({
          email_id: email.id,
          sku_code: sku.sku_code,
          name: sku.name,
          category: sku.category || "",
          color: sku.color || "",
          size: sku.size || "",
          price: sku.price || 0,
          stock_level: sku.stock_level || 0,
          match_reason: sku.match_reason || "",
          image_url: sku.image_url || "",
        }));

        const { error: skuError } = await supabase.from("recommended_skus").insert(skus);
        if (skuError) throw skuError;
      }

      results.push({ id: email.id, external_id: email.external_id });
    }

    return new Response(JSON.stringify({ success: true, emails: results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);

    await supabase.from("webhook_logs").insert({
      endpoint: "webhook-email",
      payload: { error: String(error) },
      status: "error",
      error_message: String(error),
    });

    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
