import { useEffect, useState, useCallback } from "react";
import { invokeFunction } from "@/lib/api";
import { Email, Status, Sentiment, Intent, ExtractedOrderItem, RecommendedSKU, AttachmentMeta, mockEmails } from "@/data/mockData";

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
      const data = await invokeFunction("api-emails");

      const dbEmails = data.emails || [];
      const orderItems = data.order_items || [];
      const productsArr = data.products || [];

      if (dbEmails.length > 0) {
        const productsMap: Record<string, any> = {};
        for (const p of productsArr) {
          productsMap[p.sku_code] = p;
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
    // Poll every 10 seconds instead of realtime (NeonDB has no realtime)
    const interval = setInterval(fetchEmails, 10000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  const updateStatus = useCallback(
    (id: string, status: Status) => {
      setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));

      if (usingLiveData) {
        invokeFunction("api-emails", { method: "PATCH", body: { id, status } }).catch(console.error);
      }
    },
    [usingLiveData]
  );

  return { emails, isLoading, usingLiveData, updateStatus };
}
