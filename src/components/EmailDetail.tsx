import { useState } from "react";
import { Email, Status, ExtractedOrderItem } from "@/data/mockData";
import { AIAnalysisPanel } from "./AIAnalysisPanel";
import { SKURecommendations } from "./SKURecommendations";
import { OrderDataTable } from "./OrderDataTable";
import { AIReplyEditor } from "./AIReplyEditor";
import { ActionButtons } from "./ActionButtons";
import { User, Clock, Paperclip, FileText } from "lucide-react";

interface EmailDetailProps {
  email: Email;
  onStatusChange: (id: string, status: Status) => void;
}

export function EmailDetail({ email, onStatusChange }: EmailDetailProps) {
  const [orderItems, setOrderItems] = useState<ExtractedOrderItem[]>(email.extracted_order);
  const [replyDraft, setReplyDraft] = useState(email.ai_reply_draft);

  const handleAddSKUToOrder = (skuCode: string, skuName: string) => {
    const newItem: ExtractedOrderItem = {
      id: `oi-new-${Date.now()}`,
      item_code: skuCode,
      item_name: skuName,
      quantity: 1,
      unit: "units",
      delivery_date: "",
      delivery_address: "",
      remarks: "Added from SKU recommendation",
    };
    setOrderItems([...orderItems, newItem]);
  };

  const handleReplaceSKU = (oldItemId: string, skuCode: string, skuName: string) => {
    setOrderItems(orderItems.map(item =>
      item.id === oldItemId ? { ...item, item_code: skuCode, item_name: skuName, remarks: "Replaced via SKU recommendation" } : item
    ));
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-fade-in">
      {/* Original Email Card */}
      <div className="bg-card rounded-xl shadow-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{email.subject}</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{email.customer_name}</span>
              <span className="text-xs">{email.email}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(email.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="bg-secondary/50 rounded-lg p-4 max-h-60 overflow-y-auto">
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">{email.body}</pre>
        </div>
        {email.attachments && email.attachments.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
            {email.attachments.map((a) => (
              <span key={a} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md">
                <FileText className="w-3 h-3" />{a}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* AI Analysis */}
      <AIAnalysisPanel email={email} />

      {/* SKU Recommendations */}
      {email.recommended_skus.length > 0 && (
        <SKURecommendations
          skus={email.recommended_skus}
          orderItems={orderItems}
          onAddToOrder={handleAddSKUToOrder}
          onReplace={handleReplaceSKU}
        />
      )}

      {/* Order Data */}
      {(email.intent === "Order Creation" || email.intent === "Order Change") && (
        <OrderDataTable items={orderItems} onChange={setOrderItems} />
      )}

      {/* AI Reply */}
      <AIReplyEditor draft={replyDraft} onChange={setReplyDraft} />

      {/* Actions */}
      <ActionButtons email={email} onStatusChange={onStatusChange} />
    </div>
  );
}
