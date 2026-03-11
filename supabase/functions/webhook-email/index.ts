import { getDb, corsHeaders } from "../_shared/db.ts";

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
  if (!raw.from?.value && !raw.messageId) return null;
  const fromEntry = raw.from?.value?.[0];
  const customer_name = fromEntry?.name || fromEntry?.address || "Unknown Sender";
  const customer_email = fromEntry?.address || "unknown@unknown.com";
  let body = raw.text || "";
  if (!body && raw.html) {
    body = raw.html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
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
  let customer_name = raw.customer_name || null;
  let customer_email = raw.email || null;
  let body = raw.body || raw.textPlain || raw.snippet || "";
  if (body.startsWith("<") || body.includes("<div") || body.includes("<p")) {
    body = body
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
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
    external_id:
      raw.external_id || raw.message_id || raw.messageId || raw["message-id"] || raw.id || crypto.randomUUID(),
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

  const sql = getDb();

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

    let payload: any;
    const contentType = req.headers.get("content-type") || "";

    //if (contentType.includes("multipart/form-data")) {
    //  const formData = await req.formData();
    //  const payloadField = formData.get("payload");
    //  payload = payloadField ? JSON.parse(payloadField as string) : null;
    //  const attachmentFiles: string[] = [];
    //  for (const [key, value] of formData.entries()) {
    //    if (key === "attachment" && value instanceof File) {
    //      attachmentFiles.push(value.name);
    //    }
    //  }
    //  if (payload && attachmentFiles.length > 0) {
    //    const items = Array.isArray(payload) ? payload : [payload];
    //    for (const item of items) {
    //      item._formAttachments = attachmentFiles;
    //    }
    //  }
    //} else {
    //  payload = await req.json();
    //}

    if (contentType.includes("multipart/form-data")) {
      let formData: FormData | null = null;

      try {
        formData = await req.formData();
      } catch (_) {
        formData = null;
      }

      if (formData) {
        const payloadField = formData.get("payload");

        if (payloadField) {
          try {
            payload = JSON.parse(payloadField as string);
          } catch {
            payload = payloadField;
          }
        }

        const attachmentFiles: string[] = [];

        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            attachmentFiles.push(value.name);
          }
        }

        if (payload && attachmentFiles.length > 0) {
          const items = Array.isArray(payload) ? payload : [payload];
          for (const item of items) {
            item._formAttachments = attachmentFiles;
          }
        }
      }

      // Fallback if multipart parsing failed
      if (!payload) {
        const raw = await req.text();

        const match = raw.match(/\{[\s\S]*\}/);

        if (match) {
          try {
            payload = JSON.parse(match[0]);
          } catch (_) {}
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

    // Log webhook
    await sql`INSERT INTO webhook_logs (endpoint, payload) VALUES ('webhook-email', ${JSON.stringify(payload)}::jsonb)`;

    const emails = Array.isArray(payload) ? payload : [payload];
    const results = [];

    for (const rawData of emails) {
      const { parsed, raw } = parseEmail(rawData);

      if (rawData._formAttachments?.length && !parsed.attachments.length) {
        parsed.attachments = rawData._formAttachments;
      }

      // Upsert email
      const rows = await sql`
        INSERT INTO emails (external_id, customer_name, email, subject, body, timestamp, sentiment, sentiment_confidence, intent, intent_confidence, ai_reply_draft, status, attachments)
        VALUES (
          ${parsed.external_id}, ${parsed.customer_name}, ${parsed.customer_email},
          ${parsed.subject}, ${parsed.body}, ${parsed.timestamp},
          ${raw.sentiment || "Neutral"}, ${raw.sentiment_confidence || 0},
          ${raw.intent || "General Question"}, ${raw.intent_confidence || 0},
          ${raw.ai_reply_draft || ""}, ${raw.status || "New"}, ${parsed.attachments}
        )
        ON CONFLICT (external_id) DO UPDATE SET
          customer_name = EXCLUDED.customer_name, email = EXCLUDED.email,
          subject = EXCLUDED.subject, body = EXCLUDED.body, timestamp = EXCLUDED.timestamp,
          sentiment = EXCLUDED.sentiment, sentiment_confidence = EXCLUDED.sentiment_confidence,
          intent = EXCLUDED.intent, intent_confidence = EXCLUDED.intent_confidence,
          ai_reply_draft = EXCLUDED.ai_reply_draft, status = EXCLUDED.status,
          attachments = EXCLUDED.attachments, updated_at = now()
        RETURNING id, external_id
      `;

      const email = rows[0];

      // Insert order items
      if (raw.extracted_order?.length > 0) {
        for (const item of raw.extracted_order) {
          await sql`
            INSERT INTO order_items (email_id, item_code, item_name, quantity, unit, delivery_date, delivery_address, remarks)
            VALUES (${email.id}, ${item.item_code}, ${item.item_name}, ${item.quantity || 1}, ${item.unit || "units"}, ${item.delivery_date || ""}, ${item.delivery_address || ""}, ${item.remarks || ""})
          `;
        }
      }

      results.push({ id: email.id, external_id: email.external_id });
    }

    return new Response(JSON.stringify({ success: true, emails: results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    try {
      await sql`INSERT INTO webhook_logs (endpoint, payload, status, error_message) VALUES ('webhook-email', ${JSON.stringify({ error: String(error) })}::jsonb, 'error', ${String(error)})`;
    } catch (_) {}
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
