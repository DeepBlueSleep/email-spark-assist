import { withAudit } from "../_shared/audit.ts";
import { getDb, corsHeaders } from "../_shared/db.ts";

interface AttachmentData {
  filename: string;
  content?: string;       // base64 content
  contentType?: string;   // mime type
  size?: number;
}

interface ParsedEmail {
  customer_name: string;
  customer_email: string;
  subject: string;
  body: string;
  external_id: string;
  timestamp: string;
  attachments: string[];
  attachmentData: AttachmentData[];
  thread_external_id?: string;
  in_reply_to?: string;
}

function getAttachmentFilename(att: any): string {
  return String(att?.filename || att?.fileName || att?.file_name || att?.name || "").trim();
}

function getAttachmentContent(att: any): string {
  const raw = att?.content ?? att?.data ?? att?.content_base64 ?? att?.base64 ?? att?.body?.data ?? "";
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.includes(";base64,") ? trimmed.split(";base64,").pop() || "" : trimmed;
}

function toAttachmentData(att: any): AttachmentData | null {
  const filename = getAttachmentFilename(att);
  if (!filename) return null;
  const content = getAttachmentContent(att);
  if (!content) {
    console.warn("[webhook-email] Attachment metadata received without base64 content:", filename);
    return null;
  }
  return {
    filename,
    content,
    contentType: att.contentType || att.mimeType || att.mime_type || att.type || (filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream"),
    size: att.size || att.sizeBytes || att.size_bytes || 0,
  };
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
  const attachmentData: AttachmentData[] = [];
  if (raw.attachments && Array.isArray(raw.attachments)) {
    for (const att of raw.attachments) {
      const filename = getAttachmentFilename(att);
      if (!filename) continue;
      attachments.push(filename);
      const data = toAttachmentData(att);
      if (data) attachmentData.push(data);
    }
  }
  const inReplyTo = raw.inReplyTo || raw.in_reply_to || raw.headers?.["in-reply-to"] || "";
  return {
    customer_name,
    customer_email,
    subject: raw.subject || "(No Subject)",
    body,
    external_id: raw.messageId || crypto.randomUUID(),
    timestamp: raw.date || new Date().toISOString(),
    attachments,
    attachmentData,
    thread_external_id: raw.threadId || raw.thread_id || "",
    in_reply_to: typeof inReplyTo === "string" ? inReplyTo : "",
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
    attachmentData: [],
    thread_external_id: raw.threadId || "",
    in_reply_to: getHeader("In-Reply-To") || "",
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
    } else if (typeof fromField === "string") {
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
    attachmentData: [],
    thread_external_id: raw.thread_external_id || raw.threadId || raw.thread_id || "",
    in_reply_to: raw.in_reply_to || raw.inReplyTo || raw["in-reply-to"] || "",
  };
}

function parseEmail(raw: any): { parsed: ParsedEmail; raw: any } {
  const parsed = parseN8nParsedFormat(raw) || parseGmailRawFormat(raw) || parseFlatFormat(raw);
  return { parsed, raw };
}

function toEpochMs(value: any): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const n = typeof value === "number" ? value : parseInt(String(value), 10);
    return Number.isFinite(n) ? (n < 1_000_000_000_000 ? n * 1000 : n) : null;
  }
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

function collectExternalIdCandidates(raw: any): string[] {
  const headers = raw?.payload?.headers || [];
  const headerMessageId = Array.isArray(headers)
    ? headers.find((h: any) => h?.name?.toLowerCase() === "message-id")?.value
    : null;
  return [raw?.external_id, raw?.message_id, raw?.messageId, raw?.["message-id"], raw?.id, headerMessageId]
    .filter((v) => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}


Deno.serve(withAudit("webhook-email", async (req) => {
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

    const contentType = req.headers.get("content-type") || "";
    console.log("[webhook-email] Content-Type:", contentType);

    const rawBody = await req.text();
    console.log("[webhook-email] Raw body length:", rawBody.length);
    console.log("[webhook-email] Raw body preview:", rawBody.substring(0, 500));

    let payload: any = null;

    if (contentType.includes("multipart/form-data")) {
      console.log("[webhook-email] Detected multipart/form-data");
      const jsonPatterns = [
        rawBody.match(/(\[[\s\S]*\])\s*$/),
        rawBody.match(/(\{[\s\S]*\})\s*$/),
      ];
      for (const match of jsonPatterns) {
        if (match) {
          try {
            payload = JSON.parse(match[1]);
            console.log("[webhook-email] Extracted JSON from multipart body");
            break;
          } catch (_) {}
        }
      }
      if (!payload) {
        const parts = rawBody.split(/------WebKitFormBoundary|--[\w-]+/);
        for (const part of parts) {
          const jsonMatch = part.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              payload = JSON.parse(jsonMatch[0]);
              break;
            } catch (_) {}
          }
          const objMatch = part.match(/\{[\s\S]*\}/);
          if (objMatch) {
            try {
              payload = JSON.parse(objMatch[0]);
              break;
            } catch (_) {}
          }
        }
      }
    } else {
      try {
        payload = JSON.parse(rawBody);
      } catch (e: any) {
        console.error("[webhook-email] JSON parse failed:", e.message);
      }
    }

    if (!payload) {
      await sql`INSERT INTO webhook_logs (endpoint, payload, status, error_message) VALUES ('webhook-email', ${JSON.stringify({ rawPreview: rawBody.substring(0, 1000) })}::jsonb, 'error', 'No payload could be extracted')`;
      return new Response(JSON.stringify({ error: "No payload provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sql`INSERT INTO webhook_logs (endpoint, payload) VALUES ('webhook-email', ${JSON.stringify(payload)}::jsonb)`;

    const emails = Array.isArray(payload) ? payload : [payload];
    console.log("[webhook-email] Processing", emails.length, "email(s)");
    const results = [];

    for (let rawData of emails) {
      // Collect attachment data from all wrapper levels
      let inlineAttachments: string[] = [];
      let inlineAttachmentData: AttachmentData[] = [];

      // Capture Gmail internalDate from any wrapper level (ms since epoch as string/number).
      // Used below to skip stale events whose source timestamp isn't newer than what we already stored.
      let gmailInternalDateMs: number | null = null;
      const captureInternalDate = (obj: any) => {
        if (obj && obj.internalDate != null && gmailInternalDateMs == null) {
          const n = typeof obj.internalDate === "string" ? parseInt(obj.internalDate, 10) : Number(obj.internalDate);
          if (!isNaN(n)) gmailInternalDateMs = n;
        }
      };
      captureInternalDate(rawData);

      // Collect attachments from EVERY wrapper level (and the innermost too).
      // n8n/Gmail wrappers commonly carry attachments at multiple depths, often
      // with empty arrays at some levels. We only want to overwrite our captured
      // set when we find a non-empty array at a deeper level.
      const collectAttachmentsAt = (obj: any, depth: number) => {
        if (!obj) return;
        const attachmentCandidates = Array.isArray(obj.attachments) ? obj.attachments : [];
        if (obj.fileName || obj.filename || obj.file_name) attachmentCandidates.push(obj);
        if (attachmentCandidates.length === 0) return;
        const next: AttachmentData[] = [];
        const nextNames: string[] = [];
        for (const att of attachmentCandidates) {
          const filename = getAttachmentFilename(att);
          if (!filename) continue;
          nextNames.push(filename);
          const data = toAttachmentData(att);
          if (data) next.push(data);
        }
        if (nextNames.length > 0) {
          inlineAttachments = nextNames;
          inlineAttachmentData = next;
          console.log("[webhook-email] Extracted", next.length, "attachments with base64 at depth", depth, "from", nextNames.length, "filename(s)");
        }
      };

      collectAttachmentsAt(rawData, 0);

      let unwrapDepth = 0;
      while (rawData.payload && typeof rawData.payload === "object" && unwrapDepth++ < 20) {
        rawData = rawData.payload;
        captureInternalDate(rawData);
        collectAttachmentsAt(rawData, unwrapDepth);
      }

      const { parsed, raw } = parseEmail(rawData);

      // Merge attachments from wrapper if parsed didn't find any
      if (inlineAttachments.length > 0 && !parsed.attachments.length) {
        parsed.attachments = inlineAttachments;
        parsed.attachmentData = inlineAttachmentData;
      }

      if (rawData._formAttachments?.length && !parsed.attachments.length) {
        parsed.attachments = rawData._formAttachments;
      }

      const externalIdCandidates = [...new Set([parsed.external_id, ...collectExternalIdCandidates(rawData)])];

      // Skip duplicate/stale Gmail update events. Gmail/n8n re-pushes existing messages for
      // label/read changes, and those should not upsert the row or trigger AI again.
      const existing = await sql`SELECT id, external_id, created_at, timestamp FROM emails WHERE external_id = ANY(${externalIdCandidates}::text[]) ORDER BY created_at ASC LIMIT 1`;
      if (existing.length > 0) {
        const existingRow = existing[0];
        const sourceMs = gmailInternalDateMs ?? toEpochMs(parsed.timestamp);
        const existingSourceMs = toEpochMs(existingRow.timestamp) ?? toEpochMs(existingRow.created_at);
        if (sourceMs == null || existingSourceMs == null || sourceMs <= existingSourceMs) {
          console.log("[webhook-email] Skipping duplicate/stale event:", parsed.external_id, "source=", sourceMs, "existing=", existingSourceMs);
          results.push({ skipped: true, stale: true, id: existingRow.id, external_id: existingRow.external_id });
          continue;
        }
      }

      // Upsert customer by email address (no customer_id needed)
      await sql`
        INSERT INTO customers (name, email)
        VALUES (${parsed.customer_name}, ${parsed.customer_email})
        ON CONFLICT (email) DO UPDATE SET
          name = COALESCE(NULLIF(EXCLUDED.name, 'Unknown Sender'), NULLIF(EXCLUDED.name, 'Unknown'), customers.name),
          updated_at = now()
      `;

      // Upsert email (linked to customer via email address, not customer_id).
      // IMPORTANT: AI fields (sentiment/intent/confidences/ai_reply_draft) must NOT
      // be overwritten on conflict unless the inbound payload explicitly carries them.
      // Gmail re-pushes the same external_id frequently and would otherwise wipe
      // any AI enrichment that arrived between ingestions.
      const sentimentVal = raw.sentiment ?? null;
      const sentimentConfVal = raw.sentiment_confidence ?? null;
      const intentVal = raw.intent ?? null;
      const intentConfVal = raw.intent_confidence ?? null;
      const aiDraftVal = raw.ai_reply_draft ?? null;

      // ---- Thread resolution ----
      // Resolve or create a message_threads row, then link this email to it.
      // Priority:
      //   1. thread_external_id from the payload (Gmail threadId)
      //   2. in_reply_to header → look up the parent email's thread
      //   3. fall back to a new thread keyed off the message's external_id
      const threadExternalIdRaw = (parsed.thread_external_id || "").trim();
      const inReplyToRaw = (parsed.in_reply_to || "").trim();

      let threadId: string | null = null;
      let threadExternalId: string | null = threadExternalIdRaw || null;

      if (!threadExternalId && inReplyToRaw) {
        const parent = await sql`
          SELECT thread_id, thread_external_id FROM emails
          WHERE external_id = ${inReplyToRaw}
          LIMIT 1
        `;
        if (parent.length > 0) {
          threadId = parent[0].thread_id || null;
          threadExternalId = parent[0].thread_external_id || null;
        }
      }

      if (!threadId) {
        const lookupKey = threadExternalId || parsed.external_id;
        const threadRows = await sql`
          INSERT INTO message_threads (thread_external_id, channel, subject)
          VALUES (${lookupKey}, 'email', ${parsed.subject})
          ON CONFLICT (thread_external_id) DO UPDATE SET
            subject = COALESCE(NULLIF(EXCLUDED.subject, '(No Subject)'), message_threads.subject),
            updated_at = now()
          RETURNING id
        `;
        threadId = threadRows[0].id;
        threadExternalId = lookupKey;
      }

      // Compute message_position within the thread (1-indexed by timestamp)
      const posRows = await sql`
        SELECT COUNT(*)::int AS c FROM emails WHERE thread_id = ${threadId}
      `;
      const messagePosition = (Number(posRows[0]?.c) || 0) + 1;

      const rows = await sql`
        INSERT INTO emails (external_id, customer_name, email, subject, body, timestamp, sentiment, sentiment_confidence, intent, intent_confidence, ai_reply_draft, status, attachments, thread_id, thread_external_id, in_reply_to, message_position)
        VALUES (
          ${parsed.external_id}, ${parsed.customer_name}, ${parsed.customer_email},
          ${parsed.subject}, ${parsed.body}, ${parsed.timestamp},
          ${sentimentVal ?? "Neutral"}, ${sentimentConfVal ?? 0},
          ${intentVal ?? "General Question"}, ${intentConfVal ?? 0},
          ${aiDraftVal ?? ""}, ${raw.status || "New"}, ${parsed.attachments},
          ${threadId}, ${threadExternalId}, ${inReplyToRaw || null}, ${messagePosition}
        )
        ON CONFLICT (external_id) DO UPDATE SET
          customer_name = EXCLUDED.customer_name, email = EXCLUDED.email,
          subject = EXCLUDED.subject, body = EXCLUDED.body, timestamp = EXCLUDED.timestamp,
          sentiment = COALESCE(${sentimentVal}, emails.sentiment),
          sentiment_confidence = COALESCE(${sentimentConfVal}, emails.sentiment_confidence),
          intent = COALESCE(${intentVal}, emails.intent),
          intent_confidence = COALESCE(${intentConfVal}, emails.intent_confidence),
          ai_reply_draft = COALESCE(NULLIF(${aiDraftVal}, ''), emails.ai_reply_draft),
          attachments = EXCLUDED.attachments,
          thread_id = COALESCE(emails.thread_id, EXCLUDED.thread_id),
          thread_external_id = COALESCE(emails.thread_external_id, EXCLUDED.thread_external_id),
          in_reply_to = COALESCE(NULLIF(EXCLUDED.in_reply_to, ''), emails.in_reply_to),
          updated_at = now()
          -- NOTE: Do NOT overwrite status or is_archived on conflict.
          -- These reflect user actions in the dashboard and must persist across re-ingestions.
        RETURNING id, external_id, thread_id
      `;

      const email = rows[0];
      console.log("[webhook-email] Upserted email:", email.id, email.external_id, "thread:", email.thread_id);

      // Store attachment base64 data
      if (parsed.attachmentData.length > 0) {
        // Delete existing attachments for this email (in case of upsert)
        await sql`DELETE FROM email_attachments WHERE email_id = ${email.id}`;
        
        for (const att of parsed.attachmentData) {
          const sizeBytes = att.size || (att.content ? Math.ceil(att.content.length * 3 / 4) : 0);
          await sql`
            INSERT INTO email_attachments (email_id, filename, mime_type, content_base64, size_bytes)
            VALUES (${email.id}, ${att.filename}, ${att.contentType || "application/octet-stream"}, ${att.content || ""}, ${sizeBytes})
          `;
        }
        console.log("[webhook-email] Stored", parsed.attachmentData.length, "attachment(s) for email", email.id);
      }

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

    console.log("[webhook-email] Done. Processed", results.length, "emails");
    return new Response(JSON.stringify({ success: true, emails: results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[webhook-email] Error:", error);
    try {
      await sql`INSERT INTO webhook_logs (endpoint, payload, status, error_message) VALUES ('webhook-email', ${JSON.stringify({ error: String(error) })}::jsonb, 'error', ${String(error)})`;
    } catch (_) {}
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));