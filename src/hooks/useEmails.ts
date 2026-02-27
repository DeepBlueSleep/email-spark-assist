import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Email, Status, Sentiment, Intent, ExtractedOrderItem, RecommendedSKU, mockEmails } from "@/data/mockData";

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
        // Fetch order items and SKUs for each email
        const emailIds = dbEmails.map((e) => e.id);

        const [{ data: orderItems }, { data: skus }] = await Promise.all([
          supabase.from("order_items").select("*").in("email_id", emailIds),
          supabase.from("recommended_skus").select("*").in("email_id", emailIds),
        ]);

        const mapped: Email[] = dbEmails.map((e) => ({
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
          recommended_skus: (skus || [])
            .filter((s) => s.email_id === e.id)
            .map((s) => ({
              sku_code: s.sku_code,
              name: s.name,
              category: s.category || "",
              color: s.color || "",
              size: s.size || "",
              price: Number(s.price) || 0,
              stock_level: s.stock_level || 0,
              match_reason: s.match_reason || "",
              image_url: s.image_url || "",
            })),
          ai_reply_draft: e.ai_reply_draft || "",
          status: (e.status || "New") as Status,
          attachments: e.attachments || [],
        }));

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

    // Subscribe to realtime changes
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
