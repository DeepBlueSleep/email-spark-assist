import { useEffect, useState } from "react";
import { invokeFunction } from "@/lib/api";

export interface StatusDef {
  id: string;
  key: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

const FALLBACK_STATUSES: StatusDef[] = [
  { id: "1", key: "new", display_name: "New", description: null, sort_order: 1, is_active: true },
  { id: "2", key: "ai_processed", display_name: "AI Processed", description: null, sort_order: 2, is_active: true },
  { id: "3", key: "awaiting_review", display_name: "Awaiting Review", description: null, sort_order: 3, is_active: true },
  { id: "4", key: "approved", display_name: "Approved", description: null, sort_order: 4, is_active: true },
  { id: "5", key: "replied", display_name: "Replied", description: null, sort_order: 5, is_active: true },
  { id: "6", key: "escalated", display_name: "Escalated", description: null, sort_order: 6, is_active: true },
  { id: "7", key: "awaiting_customer", display_name: "Awaiting Customer", description: null, sort_order: 7, is_active: true },
];

export function useStatuses() {
  const [statuses, setStatuses] = useState<StatusDef[]>(FALLBACK_STATUSES);

  useEffect(() => {
    invokeFunction("api-statuses")
      .then((data) => {
        if (data.statuses?.length > 0) {
          setStatuses(data.statuses);
        }
      })
      .catch(() => {
        // Use fallback
      });
  }, []);

  return statuses;
}
