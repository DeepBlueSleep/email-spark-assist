import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface ParsedEmail {
  customer_name: string;
  customer_email: string;
  subject: string;
  body: string;
  external_id: string;
  timestamp: string;
  attachments: string[];
}

function parseN8nParsedFormat(raw: any): ParsedEmail | null {
  // New n8n format with structured from/to objects, text, html, messageId
  if (!raw.from?.value && !raw.messageId) return null;

  const fromEntry = raw.from?.value?.[0];
  const customer_name = fromEntry?.name || fromEntry?.address || "Unknown Sender";
  const customer_email = fromEntry?.address || "unknown@unknown.com";

  let body = raw.text || "";
  if (!body && raw.html) {
    body = raw.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  // Extract attachment filenames if present
  const attachments: string[] = [];
  if (raw.attachments && Array.isArray(raw.attachments)) {
    for (const att of raw.attachments) {
      if (att.filename) attachments.push(att.filename);
    }
  }

  return {
    customer_name,
    customer_email,
    subject: raw.subject || "(No Subject)",
    body,
    external_id: raw.messageId || crypto.randomUUID(),
    timestamp: raw.date || new Date().toISOString(),
    attachments,
  };
}

function parseGmailRawFormat(raw: any): ParsedEmail | null {
  // Gmail API format with payload.headers, labelIds, etc.
  if (!raw.payload?.headers && !raw.labelIds) return null;

  const headers = raw.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  let bodyText = "";
  const parts = raw.payload?.parts || [];
  const bodyData = raw.payload?.body?.data;

  if (bodyData) {
    bodyText = atob(bodyData.replace(/-/g, "+").replace(/_/g, "/"));
  } else {
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        bodyText = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        break;
      }
    }
    if (!bodyText) {
      for (const part of parts) {
        if (part.mimeType === "text/html" && part.body?.data) {
          bodyText = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
          break;
        }
      }
    }
  }

  const fromField = getHeader("From") || raw.from || "";
  let customer_name = "";
  let customer_email = "";
  const match = fromField.match(/(.*)<(.*)>/);
  if (match) {
    customer_name = match[1].trim().replace(/^"|"$/g, "");
    customer_email = match[2].trim();
  } else {
    customer_email = fromField.trim();
  }

  return {
    customer_name: customer_name || customer_email || "Unknown Sender",
    customer_email: customer_email || "unknown@unknown.com",
    subject: getHeader("Subject") || raw.subject || "(No Subject)",
    body: bodyText || raw.snippet || "",
    external_id: getHeader("Message-ID") || raw.id || crypto.randomUUID(),
    timestamp: raw.internalDate
      ? new Date(parseInt(raw.internalDate)).toISOString()
      : getHeader("Date") || new Date().toISOString(),
    attachments: raw.attachments || [],
  };
}

function parseFlatFormat(raw: any): ParsedEmail {
  // Flat/legacy format with direct fields
  let customer_name = raw.customer_name || null;
  let customer_email = raw.email || null;
  let body = raw.body || raw.textPlain || raw.snippet || "";

  if (body.startsWith("<") || body.includes("<div") || body.includes("<p")) {
    body = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  const fromField = raw.from || raw.From || "";
  if (!customer_email && fromField) {
    const match = fromField.match(/(.*)<(.*)>/);
    if (match) {
      customer_name = customer_name || match[1].trim().replace(/^"|"$/g, "");
      customer_email = match[2].trim();
    } else {
      customer_email = fromField.trim();
    }
  }

  return {
    customer_name: customer_name || customer_email || "Unknown Sender",
    customer_email: customer_email || "unknown@unknown.com",
    subject: raw.subject || "(No Subject)",
    body,
    external_id: raw.external_id || raw.message_id || raw.messageId || raw["message-id"] || raw.id || crypto.randomUUID(),
    timestamp: raw.timestamp || raw.date || new Date().toISOString(),
    attachments: raw.attachments || [],
  };
}

function parseEmail(raw: any): { parsed: ParsedEmail; raw: any } {
  const parsed = parseN8nParsedFormat(raw) || parseGmailRawFormat(raw) || parseFlatFormat(raw);
  return { parsed, raw };
}

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

    // Handle both JSON and form data
    let payload: any;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const payloadField = formData.get("payload");
      payload = payloadField ? JSON.parse(payloadField as string) : null;
      // Attachment files from form data (filenames logged)
      const attachmentFiles: string[] = [];
      for (const [key, value] of formData.entries()) {
        if (key === "attachment" && value instanceof File) {
          attachmentFiles.push(value.name);
        }
      }
      if (payload && attachmentFiles.length > 0) {
        const items = Array.isArray(payload) ? payload : [payload];
        for (const item of items) {
          item._formAttachments = attachmentFiles;
        }
      }
    } else {
      payload = await req.json();
    }

    if (!payload) {
      return new Response(JSON.stringify({ error: "No payload provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the webhook
    await supabase.from("webhook_logs").insert({
      endpoint: "webhook-email",
      payload: typeof payload === "object" ? payload : { raw: String(payload) },
    });

    // Support single or batch emails
    const emails = Array.isArray(payload) ? payload : [payload];
    const results = [];

    for (const rawData of emails) {
      const { parsed, raw } = parseEmail(rawData);

      // Merge form-level attachments
      if (rawData._formAttachments?.length && !parsed.attachments.length) {
        parsed.attachments = rawData._formAttachments;
      }

      // Insert the email
      const { data: email, error: emailError } = await supabase
        .from("emails")
        .upsert(
          {
            external_id: parsed.external_id,
            customer_name: parsed.customer_name,
            email: parsed.customer_email,
            subject: parsed.subject,
            body: parsed.body,
            timestamp: parsed.timestamp,
            sentiment: raw.sentiment || "Neutral",
            sentiment_confidence: raw.sentiment_confidence || 0,
            intent: raw.intent || "General Question",
            intent_confidence: raw.intent_confidence || 0,
            ai_reply_draft: raw.ai_reply_draft || "",
            status: raw.status || "New",
            attachments: parsed.attachments,
          },
          { onConflict: "external_id" },
        )
        .select()
        .single();

      if (emailError) throw emailError;

      // Insert order items if provided
      if (raw.extracted_order?.length > 0) {
        const orderItems = raw.extracted_order.map((item: any) => ({
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
      if (raw.recommended_skus?.length > 0) {
        const skus = raw.recommended_skus.map((sku: any) => ({
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
