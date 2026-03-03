import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      endpoint: "webhook-ai-enrichment",
      payload,
    });

    // --- Resolve email ---
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

    // --- 1. Update AI analysis fields on the email ---
    const updateFields: Record<string, any> = {};
    if (payload.sentiment !== undefined) updateFields.sentiment = payload.sentiment;
    if (payload.sentiment_confidence !== undefined) updateFields.sentiment_confidence = payload.sentiment_confidence;
    if (payload.intent !== undefined) updateFields.intent = payload.intent;
    if (payload.intent_confidence !== undefined) updateFields.intent_confidence = payload.intent_confidence;
    if (payload.status !== undefined) updateFields.status = payload.status;

    // --- 2. AI reply drafts ---
    let drafts: { tone: string; draft: string }[] = [];

    if (payload.drafts && typeof payload.drafts === "object" && !Array.isArray(payload.drafts)) {
      for (const [tone, text] of Object.entries(payload.drafts)) {
        if (text) {
          drafts.push({
            tone: tone.charAt(0).toUpperCase() + tone.slice(1).toLowerCase(),
            draft: text as string,
          });
        }
      }
    } else if (Array.isArray(payload.drafts)) {
      drafts = payload.drafts.map((d: any) => ({
        tone: d.tone || "Professional",
        draft: d.draft || d.text || d.content || "",
      }));
    } else if (payload.ai_reply_draft) {
      drafts.push({ tone: "Professional", draft: payload.ai_reply_draft });
    }

    if (drafts.length > 0) {
      await supabase.from("ai_reply_drafts").delete().eq("email_id", dbEmailId);
      const insertData = drafts.map((d) => ({
        email_id: dbEmailId,
        tone: d.tone,
        draft: d.draft,
      }));
      const { error: insertError } = await supabase.from("ai_reply_drafts").insert(insertData);
      if (insertError) throw insertError;

      // Set default draft on email record
      const defaultDraft = drafts.find((d) => d.tone === "Professional") || drafts[0];
      updateFields.ai_reply_draft = defaultDraft.draft;
    }

    if (Object.keys(updateFields).length > 0) {
      const { error: updateError } = await supabase
        .from("emails")
        .update(updateFields)
        .eq("id", dbEmailId);
      if (updateError) throw updateError;
    }

    // --- 3. Extracted order items ---
    if (payload.extracted_order?.length > 0) {
      await supabase.from("order_items").delete().eq("email_id", dbEmailId);
      const orderItems = payload.extracted_order.map((item: any) => ({
        email_id: dbEmailId,
        item_code: item.item_code,
        item_name: item.item_name,
        quantity: item.quantity || 1,
        unit: item.unit || "units",
        delivery_date: item.delivery_date || "",
        delivery_address: item.delivery_address || "",
        remarks: item.remarks || "",
      }));
      const { error } = await supabase.from("order_items").insert(orderItems);
      if (error) throw error;
    }

    // --- 4. Recommended SKUs ---
    if (payload.recommended_skus?.length > 0) {
      await supabase.from("recommended_skus").delete().eq("email_id", dbEmailId);
      const skus = payload.recommended_skus.map((sku: any) => ({
        email_id: dbEmailId,
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
      const { error } = await supabase.from("recommended_skus").insert(skus);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: dbEmailId,
        updated_fields: Object.keys(updateFields),
        drafts_count: drafts.length,
        order_items_count: payload.extracted_order?.length || 0,
        recommended_skus_count: payload.recommended_skus?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI enrichment webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
