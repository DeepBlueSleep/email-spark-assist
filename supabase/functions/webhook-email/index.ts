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

    for (const rawData of emails) {
      // --- Normalize Gmail / n8n structure ---
      // n8n Gmail node typically sends fields like:
      //   id, threadId, labelIds, snippet,
      //   payload.headers (array of {name, value}),
      //   payload.parts or payload.body,
      //   internalDate, sizeEstimate
      // It may also send a flattened version with:
      //   from, to, subject, textPlain, textHtml, date, messageId

      const isGmailRaw = rawData.payload?.headers || rawData.labelIds;
      let emailData = rawData;

      if (isGmailRaw) {
        // Extract headers from Gmail API format
        const headers = rawData.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

        // Decode body from Gmail parts
        let bodyText = "";
        const parts = rawData.payload?.parts || [];
        const bodyData = rawData.payload?.body?.data;

        if (bodyData) {
          bodyText = atob(bodyData.replace(/-/g, "+").replace(/_/g, "/"));
        } else {
          for (const part of parts) {
            if (part.mimeType === "text/plain" && part.body?.data) {
              bodyText = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
              break;
            }
          }
          // Fallback to html part
          if (!bodyText) {
            for (const part of parts) {
              if (part.mimeType === "text/html" && part.body?.data) {
                bodyText = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
                break;
              }
            }
          }
        }

        // Flatten into our normalized shape
        emailData = {
          ...rawData,
          from: getHeader("From") || rawData.from,
          subject: getHeader("Subject") || rawData.subject || "",
          body: bodyText || rawData.snippet || "",
          message_id: getHeader("Message-ID") || rawData.id,
          timestamp: rawData.internalDate
            ? new Date(parseInt(rawData.internalDate)).toISOString()
            : getHeader("Date") || new Date().toISOString(),
        };
      }

      // --- Parse from/email fields ---
      let customer_name = emailData.customer_name || null;
      let customer_email = emailData.email || null;
      let body = emailData.body || emailData.textPlain || emailData.snippet || "";

      // Strip HTML tags if body looks like HTML
      if (body.startsWith("<") || body.includes("<div") || body.includes("<p")) {
        body = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      }

      // Handle "Name <email>" format from Gmail
      const fromField = emailData.from || emailData.From || "";
      if (!customer_email && fromField) {
        const match = fromField.match(/(.*)<(.*)>/);
        if (match) {
          customer_name = customer_name || match[1].trim().replace(/^"|"$/g, "");
          customer_email = match[2].trim();
        } else {
          customer_email = fromField.trim();
        }
      }

      if (!customer_name) {
        customer_name = customer_email || "Unknown Sender";
      }

      if (!customer_email) {
        customer_email = "unknown@unknown.com";
      }

      // Build external_id from available identifiers
      const externalId =
        emailData.external_id ||
        emailData.message_id ||
        emailData.messageId ||
        emailData["message-id"] ||
        emailData.id ||
        crypto.randomUUID();

      // Insert the email
      const { data: email, error: emailError } = await supabase
        .from("emails")
        .upsert(
          {
            external_id: externalId,
            customer_name,
            email: customer_email,
            subject: emailData.subject || "(No Subject)",
            body,
            timestamp: emailData.timestamp || emailData.date || new Date().toISOString(),
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
