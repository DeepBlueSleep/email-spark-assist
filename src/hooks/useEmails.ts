import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Email, Status, Sentiment, Intent, ExtractedOrderItem, RecommendedSKU, mockEmails } from "@/data/mockData";

interface SkuRef {
  sku_code: string;
  match_reason?: string;
}

export function useEmails() {
  const [emails, setEmails] = useState<Email[]>(mockEmails);
  const [isLoading, setIsLoading] = useState(true);
  const [usingLiveData, setUsingLiveData] = useState(false);

  const fetchEmails = useCallback(async () => {
    try {
      const { data: dbEmails, error } = await supabase
        .from("emails")
        .select("*")
        .order("timestamp", { ascending: false });

      if (error) throw error;

      if (dbEmails && dbEmails.length > 0) {
        const emailIds = dbEmails.map((e) => e.id);

        // Fetch order items
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("*")
          .in("email_id", emailIds);

        // Collect all sku_codes from all emails' recommended_sku_codes
        const allSkuRefs: SkuRef[] = [];
        for (const e of dbEmails) {
          const refs = (e as any).recommended_sku_codes as SkuRef[] | null;
          if (refs && Array.isArray(refs)) {
            allSkuRefs.push(...refs);
          }
        }
        const uniqueSkuCodes = [...new Set(allSkuRefs.map((r) => r.sku_code))];

        // Fetch product details for recommended SKUs
        let productsMap: Record<string, any> = {};
        if (uniqueSkuCodes.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("*")
            .in("sku_code", uniqueSkuCodes);
          if (products) {
            for (const p of products) {
              productsMap[p.sku_code] = p;
            }
          }
        }

        const mapped: Email[] = dbEmails.map((e) => {
          const skuRefs = ((e as any).recommended_sku_codes as SkuRef[] | null) || [];
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
              .filter((oi) => oi.email_id === e.id)
              .map((oi) => ({
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
              .filter((ref) => productsMap[ref.sku_code])
              .map((ref) => {
                const p = productsMap[ref.sku_code];
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
              }),
            ai_reply_draft: e.ai_reply_draft || "",
            status: (e.status || "New") as Status,
            attachments: e.attachments || [],
          };
        });

        setEmails(mapped);
        setUsingLiveData(true);
      }
    } catch (err) {
      console.log("Using mock data (no live data available):", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();

    const channel = supabase
      .channel("emails-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emails" },
        () => {
          fetchEmails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEmails]);

  const updateStatus = useCallback(
    (id: string, status: Status) => {
      setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));

      if (usingLiveData) {
        supabase.from("emails").update({ status }).eq("id", id).then();
      }
    },
    [usingLiveData]
  );

  return { emails, isLoading, usingLiveData, updateStatus };
}
