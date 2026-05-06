import { useEffect, useState, useCallback, useRef } from "react";
import { invokeFunction } from "@/lib/api";
import { Email, Customer, Status, Sentiment, Intent, RecommendedSKU, mockEmails } from "@/data/mockData";
import { getProductsBySkuCodes } from "@/lib/productService";

interface SkuRef {
  sku_code: string;
  match_reason?: string;
}

export function useEmails() {
  const [emails, setEmails] = useState<Email[]>(mockEmails);
  const [isLoading, setIsLoading] = useState(true);
  const [usingLiveData, setUsingLiveData] = useState(false);
  const pendingPatchesRef = useRef<Record<string, Partial<Email>>>({});

  const addPendingPatch = useCallback((id: string, patch: Partial<Email>) => {
    pendingPatchesRef.current[id] = { ...(pendingPatchesRef.current[id] || {}), ...patch };
  }, []);

  const clearPendingPatch = useCallback((id: string, keys?: (keyof Email)[]) => {
    if (!keys) {
      delete pendingPatchesRef.current[id];
      return;
    }
    const current = pendingPatchesRef.current[id];
    if (!current) return;
    keys.forEach((key) => delete current[key]);
    if (Object.keys(current).length === 0) delete pendingPatchesRef.current[id];
  }, []);

  const fetchEmails = useCallback(async () => {
    try {
      const data = await invokeFunction("api-emails");

      const dbEmails = data.emails || [];
      const orderItems = data.order_items || [];
      const emailAttachments = data.email_attachments || [];
      const customersArr = data.customers || [];

      if (dbEmails.length === 0) {
        setEmails([]);
        setUsingLiveData(true);
        return;
      }

      const normalizeSkuCode = (sku: unknown) => String(sku ?? "").trim().toUpperCase();

      const allSkuCodes: string[] = [];
      for (const e of dbEmails) {
        const refs = (e.recommended_sku_codes as SkuRef[] | null) || [];
        for (const ref of refs) {
          const code = String(ref.sku_code ?? "").trim().toUpperCase();
          if (code) allSkuCodes.push(code);
        }
      }
      const uniqueSkuCodes = [...new Set(allSkuCodes)];

      const productsArr = uniqueSkuCodes.length > 0 ? await getProductsBySkuCodes(uniqueSkuCodes) : [];
      const productsMap: Record<string, any> = {};
      for (const p of productsArr) {
        const normalized = normalizeSkuCode(p.sku_code);
        if (normalized) productsMap[normalized] = p;
      }

      const customersMap: Record<string, Customer> = {};
      for (const c of customersArr) {
        customersMap[c.id] = c;
      }

      const mapped: Email[] = dbEmails.map((e: any) => {
        const skuRefs = (e.recommended_sku_codes as SkuRef[] | null) || [];
        return {
          id: e.id,
          customer_name: e.customer_name,
          email: e.email,
          subject: e.subject,
          body: e.body,
          timestamp: e.timestamp,
          sentiment: (e.sentiment?.toLowerCase() || "neutral") as Sentiment,
          sentiment_confidence: Number(e.sentiment_confidence) || 0,
          intent: (e.intent || "General Question") as Intent,
          intent_confidence: Number(e.intent_confidence) || 0,
          extracted_order: (orderItems || [])
            .filter((oi: any) => oi.email_id === e.id)
            .map((oi: any) => ({
              id: oi.id,
              item_code: oi.item_code,
              item_name: oi.item_name,
              quantity: oi.quantity || 1,
              unit: oi.unit || "units",
              delivery_date: oi.delivery_date || "",
              delivery_address: oi.delivery_address || "",
              remarks: oi.remarks || "",
            })),
          recommended_skus: skuRefs
            .map((ref) => {
              const normalizedCode = String(ref.sku_code ?? "").trim().toUpperCase();
              if (!normalizedCode) return null;
              const p = productsMap[normalizedCode];
              if (!p || p.is_active === false) return null;
              return {
                sku_code: p.sku_code,
                name: p.name,
                category: p.category || "",
                color: p.color || "",
                size: p.size || "",
                price: Number(p.price) || 0,
                stock_level: p.stock_level || 0,
                match_reason: ref.match_reason || "",
                image_url: p.image_url || "",
              };
            })
            .filter((sku): sku is RecommendedSKU => sku !== null),
          ai_reply_draft: e.ai_reply_draft || "",
          status: (e.status || "New") as Status,
          attachments: e.attachments || [],
          attachmentsMeta: (emailAttachments as any[])
            .filter((a: any) => a.email_id === e.id)
            .map((a: any) => ({
              id: a.id,
              email_id: a.email_id,
              filename: a.filename,
              mime_type: a.mime_type,
              size_bytes: a.size_bytes || 0,
            })),
          customer_id: e.customer_id || undefined,
          customer: e.customer_id ? customersMap[e.customer_id] : undefined,
          is_relevant: e.is_relevant !== false,
          relevance_reason: e.relevance_reason || "",
          is_archived: false,
        };
      });

      const pendingPatches = pendingPatchesRef.current;
      setEmails(mapped.map((e) => ({ ...e, ...(pendingPatches[e.id] || {}) })));
      setUsingLiveData(true);
    } catch (err) {
      console.log("Using mock data (no live data available):", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, 10000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  const updateStatus = useCallback(
    (id: string, status: Status) => {
      addPendingPatch(id, { status });
      setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));

      if (usingLiveData) {
        invokeFunction("api-emails", { method: "PATCH", body: { id, status } })
          .then(() => clearPendingPatch(id, ["status"]))
          .catch((err) => { clearPendingPatch(id, ["status"]); console.error(err); });
      }
    },
    [addPendingPatch, clearPendingPatch, usingLiveData]
  );

  const setRelevant = useCallback(
    (id: string, is_relevant: boolean) => {
      addPendingPatch(id, { is_relevant });
      setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, is_relevant } : e)));
      if (usingLiveData) {
        invokeFunction("api-emails", { method: "PATCH", body: { id, is_relevant } })
          .then(() => clearPendingPatch(id, ["is_relevant"]))
          .catch((err) => { clearPendingPatch(id, ["is_relevant"]); console.error(err); });
      }
    },
    [addPendingPatch, clearPendingPatch, usingLiveData]
  );

  const bulkSetRelevant = useCallback(
    async (ids: string[], is_relevant: boolean) => {
      if (ids.length === 0) return;
      const set = new Set(ids);
      ids.forEach((id) => addPendingPatch(id, { is_relevant }));
      setEmails((prev) => prev.map((e) => (set.has(e.id) ? { ...e, is_relevant } : e)));
      if (usingLiveData) {
        try {
          await invokeFunction("api-emails", { method: "PATCH", body: { ids, is_relevant } });
          ids.forEach((id) => clearPendingPatch(id, ["is_relevant"]));
        } catch (err) {
          console.error("Failed to bulk update relevance:", err);
          ids.forEach((id) => clearPendingPatch(id, ["is_relevant"]));
          setEmails((prev) => prev.map((e) => (set.has(e.id) ? { ...e, is_relevant: !is_relevant } : e)));
        }
      }
    },
    [addPendingPatch, clearPendingPatch, usingLiveData]
  );

  const bulkSetStatus = useCallback(
    async (ids: string[], status: Status) => {
      if (ids.length === 0) return;
      const set = new Set(ids);
      ids.forEach((id) => addPendingPatch(id, { status }));
      setEmails((prev) => prev.map((e) => (set.has(e.id) ? { ...e, status } : e)));
      if (usingLiveData) {
        try {
          await invokeFunction("api-emails", { method: "PATCH", body: { ids, status } });
          ids.forEach((id) => clearPendingPatch(id, ["status"]));
        } catch (err) {
          console.error("Failed to bulk update status:", err);
          ids.forEach((id) => clearPendingPatch(id, ["status"]));
        }
      }
    },
    [addPendingPatch, clearPendingPatch, usingLiveData]
  );

  return { emails, isLoading, usingLiveData, updateStatus, markRead, setRelevant, bulkSetRelevant, bulkMarkRead, bulkSetStatus };
}
