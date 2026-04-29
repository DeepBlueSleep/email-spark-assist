import { withAudit } from "../_shared/audit.ts";
import { getDb, corsHeaders } from "../_shared/db.ts";

Deno.serve(withAudit("webhook-ai-enrichment", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sql = getDb();

  try {
    // Ensure relevance columns exist (idempotent guard for NeonDB)
    await sql`ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_relevant boolean NOT NULL DEFAULT true`;
    await sql`ALTER TABLE emails ADD COLUMN IF NOT EXISTS relevance_reason text DEFAULT ''`;

    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    if (webhookSecret) {
      const providedSecret = req.headers.get("x-webhook-secret");
      if (providedSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const rawPayload = await req.json();
    const items = Array.isArray(rawPayload) ? rawPayload : [rawPayload];

    await sql`INSERT INTO webhook_logs (endpoint, payload) VALUES ('webhook-ai-enrichment', ${JSON.stringify(rawPayload)}::jsonb)`;

    const results = [];

    for (const payload of items) {
      const emailId = payload.email_id;
      const externalId = payload.external_id;

      let emailRows;
      if (emailId) {
        emailRows = await sql`SELECT id, status, ai_reply_draft FROM emails WHERE id = ${emailId}`;
      } else if (externalId) {
        emailRows = await sql`SELECT id, status, ai_reply_draft FROM emails WHERE external_id = ${externalId}`;
      } else {
        results.push({ error: "email_id or external_id required", payload });
        continue;
      }

      if (!emailRows || emailRows.length === 0) {
        results.push({ error: "Email not found", email_id: emailId, external_id: externalId });
        continue;
      }

      const dbEmailId = emailRows[0].id;

      // n8n/Gmail can re-run AI after label/read/archive updates. If this email
      // is already enriched, ignore duplicate AI payloads unless explicitly forced.
      const forceReprocess = payload.force_reprocess === true || payload.force === true;
      const alreadyEnriched =
        ["AI Processed", "Irrelevant"].includes(emailRows[0].status) ||
        String(emailRows[0].ai_reply_draft || "").trim().length > 0;
      if (alreadyEnriched && !forceReprocess) {
        results.push({ skipped: true, duplicate_ai_enrichment: true, email_id: dbEmailId, external_id: externalId });
        continue;
      }

      // Build update fields
      const vals: any = {};

      if (payload.sentiment !== undefined) vals.sentiment = payload.sentiment;
      if (payload.sentiment_confidence !== undefined) vals.sentiment_confidence = payload.sentiment_confidence;
      if (payload.intent !== undefined) vals.intent = payload.intent;
      if (payload.intent_confidence !== undefined) vals.intent_confidence = payload.intent_confidence;
      if (payload.is_relevant !== undefined) vals.is_relevant = !!payload.is_relevant;
      if (payload.relevance_reason !== undefined) vals.relevance_reason = String(payload.relevance_reason || "");
      // Status is auto-set based on relevance, but ONLY when the email is still in
      // its initial "New" state. Once the user has taken any action (Replied,
      // Escalated, AI Processed, Awaiting Customer, etc.), AI re-enrichment must
      // not clobber that workflow state.
      vals.status = payload.is_relevant === false ? "Irrelevant" : "AI Processed";

      // AI reply drafts
      let drafts: { tone: string; draft: string }[] = [];
      if (payload.drafts && typeof payload.drafts === "object" && !Array.isArray(payload.drafts)) {
        for (const [tone, text] of Object.entries(payload.drafts)) {
          if (text) drafts.push({ tone: tone.charAt(0).toUpperCase() + tone.slice(1).toLowerCase(), draft: text as string });
        }
      } else if (Array.isArray(payload.drafts)) {
        drafts = payload.drafts.map((d: any) => ({ tone: d.tone || "Professional", draft: d.draft || d.text || d.content || "" }));
      } else if (payload.ai_reply_draft) {
        drafts.push({ tone: "Professional", draft: payload.ai_reply_draft });
      }

      if (drafts.length > 0) {
        await sql`DELETE FROM ai_reply_drafts WHERE email_id = ${dbEmailId}`;
        for (const d of drafts) {
          await sql`INSERT INTO ai_reply_drafts (email_id, tone, draft) VALUES (${dbEmailId}, ${d.tone}, ${d.draft})`;
        }
        const defaultDraft = drafts.find((d) => d.tone === "Professional") || drafts[0];
        vals.ai_reply_draft = defaultDraft.draft;
      }

      // Recommended SKUs
      if (payload.recommended_skus !== undefined) {
        const skuRefs = (payload.recommended_skus || []).map((sku: any) => ({
          sku_code: sku.sku_code, match_reason: sku.match_reason || "",
        }));
        vals.recommended_sku_codes = JSON.stringify(skuRefs);
      }

      // Apply updates using a single parameterized query
      const skuCodesVal = vals.recommended_sku_codes ?? null;
      await sql`
        UPDATE emails SET
          sentiment = COALESCE(${vals.sentiment ?? null}, sentiment),
          sentiment_confidence = COALESCE(${vals.sentiment_confidence ?? null}, sentiment_confidence),
          intent = COALESCE(${vals.intent ?? null}, intent),
          intent_confidence = COALESCE(${vals.intent_confidence ?? null}, intent_confidence),
          is_relevant = COALESCE(${vals.is_relevant ?? null}, is_relevant),
          relevance_reason = COALESCE(${vals.relevance_reason ?? null}, relevance_reason),
          status = CASE WHEN status IN ('New', 'AI Processed', 'Irrelevant') THEN ${vals.status} ELSE status END,
          ai_reply_draft = COALESCE(${vals.ai_reply_draft ?? null}, ai_reply_draft),
          recommended_sku_codes = COALESCE(${skuCodesVal}::jsonb, recommended_sku_codes),
          updated_at = now()
        WHERE id = ${dbEmailId}
      `;

      // Extracted order items
      if (payload.extracted_order?.length > 0) {
        await sql`DELETE FROM order_items WHERE email_id = ${dbEmailId}`;
        for (const item of payload.extracted_order) {
          await sql`
            INSERT INTO order_items (email_id, item_code, item_name, quantity, unit, delivery_date, delivery_address, remarks)
            VALUES (${dbEmailId}, ${item.item_code}, ${item.item_name}, ${item.quantity || 1}, ${item.unit || "units"}, ${item.delivery_date || ""}, ${item.delivery_address || ""}, ${item.remarks || ""})
          `;
        }
      }

      results.push({
        success: true, email_id: dbEmailId,
        updated_fields: Object.keys(vals),
        drafts_count: drafts.length,
        order_items_count: payload.extracted_order?.length || 0,
        recommended_skus_count: payload.recommended_skus?.length || 0,
      });
    }

    return new Response(
      JSON.stringify(items.length === 1 ? results[0] : { results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("AI enrichment webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
