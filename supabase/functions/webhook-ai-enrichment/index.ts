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

    const rawPayload = await req.json();
    const items = Array.isArray(rawPayload) ? rawPayload : [rawPayload];

    await supabase.from("webhook_logs").insert({
      endpoint: "webhook-ai-enrichment",
      payload: rawPayload,
    });

    const results = [];

    for (const payload of items) {
      // --- Resolve email ---
      const emailId = payload.email_id;
      const externalId = payload.external_id;

      let query = supabase.from("emails").select("id");
      if (emailId) {
        query = query.eq("id", emailId);
      } else if (externalId) {
        query = query.eq("external_id", externalId);
      } else {
        results.push({ error: "email_id or external_id required", payload });
        continue;
      }

      const { data: emailRecord, error: findError } = await query.single();
      if (findError || !emailRecord) {
        results.push({ error: "Email not found", email_id: emailId, external_id: externalId });
        continue;
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

        const defaultDraft = drafts.find((d) => d.tone === "Professional") || drafts[0];
        updateFields.ai_reply_draft = defaultDraft.draft;
      }

      // --- 3. Recommended SKUs (stored as jsonb array on emails) ---
      if (payload.recommended_skus !== undefined) {
        const skuRefs = (payload.recommended_skus || []).map((sku: any) => ({
          sku_code: sku.sku_code,
          match_reason: sku.match_reason || "",
        }));
        updateFields.recommended_sku_codes = skuRefs;
      }

      if (Object.keys(updateFields).length > 0) {
        const { error: updateError } = await supabase
          .from("emails")
          .update(updateFields)
          .eq("id", dbEmailId);
        if (updateError) throw updateError;
      }

      // --- 4. Extracted order items ---
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

      results.push({
        success: true,
        email_id: dbEmailId,
        updated_fields: Object.keys(updateFields),
        drafts_count: drafts.length,
        order_items_count: payload.extracted_order?.length || 0,
        recommended_skus_count: payload.recommended_skus?.length || 0,
      });
    }

    return new Response(
      JSON.stringify(items.length === 1 ? results[0] : { results }),
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
