import { useEffect, useState, useCallback } from "react";
import { invokeFunction } from "@/lib/api";

export interface DashCustomer {
  id: string;
  name: string;
  email: string;
  company?: string;
  credit_limit?: number;
  credit_used?: number;
  credit_terms?: string;
}

export interface DashEmailRaw {
  id: string;
  customer_name: string;
  email: string;
  subject: string;
  timestamp: string;
  status: string | null;
  intent: string | null;
  intent_confidence: number | null;
  is_read: boolean;
  is_archived: boolean;
  is_relevant: boolean;
  customer_id: string | null;
}

export interface DashOrderItem {
  id: string;
  email_id: string;
  item_code: string;
  item_name: string;
  quantity: number | null;
}

export function useDashboardData() {
  const [emails, setEmails] = useState<DashEmailRaw[]>([]);
  const [orderItems, setOrderItems] = useState<DashOrderItem[]>([]);
  const [customers, setCustomers] = useState<DashCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usingLiveData, setUsingLiveData] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [emailRes, custRes] = await Promise.all([
        invokeFunction("api-emails"),
        invokeFunction("api-customers").catch(() => ({ customers: [] })),
      ]);
      setEmails(emailRes.emails || []);
      setOrderItems(emailRes.order_items || []);
      const custList = (custRes.customers || []).map((c: any) => ({
        ...c,
        credit_limit: Number(c.credit_limit) || 0,
        credit_used: Number(c.credit_used) || 0,
      }));
      setCustomers(custList);
      setUsingLiveData(true);
    } catch (err) {
      console.log("Dashboard: live data unavailable", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 10000);
    return () => clearInterval(t);
  }, [fetchAll]);

  return { emails, orderItems, customers, isLoading, usingLiveData, refetch: fetchAll };
}
