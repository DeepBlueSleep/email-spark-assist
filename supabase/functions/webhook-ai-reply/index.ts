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
      endpoint: "webhook-ai-reply",
      payload,
    });

    // Find email by email_id or external_id
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

    // Expects drafts object: { professional: "...", friendly: "...", direct: "..." }
    // OR an array: [{ tone: "Professional", draft: "..." }, ...]
    let drafts: { tone: string; draft: string }[] = [];

    if (payload.drafts && typeof payload.drafts === "object" && !Array.isArray(payload.drafts)) {
      // Object format: { professional: "text", friendly: "text", direct: "text" }
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
    } else if (payload.draft || payload.text) {
      // Single draft with optional tone
      drafts.push({
        tone: payload.tone || "Professional",
        draft: payload.draft || payload.text || "",
      });
    }

    if (drafts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No drafts provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete existing drafts for this email and insert new ones
    await supabase.from("ai_reply_drafts").delete().eq("email_id", dbEmailId);

    const insertData = drafts.map((d) => ({
      email_id: dbEmailId,
      tone: d.tone,
      draft: d.draft,
    }));

    const { error: insertError } = await supabase.from("ai_reply_drafts").insert(insertData);
    if (insertError) throw insertError;

    // Also update the default ai_reply_draft on the email (use Professional or first)
    const defaultDraft = drafts.find((d) => d.tone === "Professional") || drafts[0];
    await supabase
      .from("emails")
      .update({ ai_reply_draft: defaultDraft.draft })
      .eq("id", dbEmailId);

    return new Response(
      JSON.stringify({ success: true, email_id: dbEmailId, drafts_count: drafts.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI reply webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
