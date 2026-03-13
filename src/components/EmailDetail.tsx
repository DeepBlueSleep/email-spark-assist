import { useState, useCallback } from "react";
import { Email, Status, ExtractedOrderItem } from "@/data/mockData";
import { AIAnalysisPanel } from "./AIAnalysisPanel";
import { OrderDataTable } from "./OrderDataTable";
import { DraftOrder } from "./DraftOrder";
import type { DraftOrderItem } from "./DraftOrder";
import { AIReplyEditor } from "./AIReplyEditor";
import { ActionButtons } from "./ActionButtons";
import { AttachmentsPanel } from "./AttachmentsPanel";
import { User, Clock, Paperclip } from "lucide-react";

interface EmailDetailProps {
  email: Email;
  onStatusChange: (id: string, status: Status) => void;
}

export function EmailDetail({ email, onStatusChange }: EmailDetailProps) {
  const [orderItems, setOrderItems] = useState<ExtractedOrderItem[]>(email.extracted_order);
  const [replyDraft, setReplyDraft] = useState(email.ai_reply_draft);
  const [selectedTone, setSelectedTone] = useState("Professional");
  const [showAttachments, setShowAttachments] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [draftOrderItems, setDraftOrderItems] = useState<DraftOrderItem[]>([]);
  const handleTotalChange = useCallback((total: number) => setOrderTotal(total), []);
  const handleItemsChange = useCallback((items: DraftOrderItem[]) => setDraftOrderItems(items), []);

  // Reset local state when email changes
  const [prevEmailId, setPrevEmailId] = useState(email.id);
  if (email.id !== prevEmailId) {
    setPrevEmailId(email.id);
    setOrderItems(email.extracted_order);
    setReplyDraft(email.ai_reply_draft);
    setSelectedTone("Professional");
    setShowAttachments(false);
  }

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

  const hasOrderData = email.extracted_order.length > 0;
  const hasDraftOrder = email.recommended_skus.length > 0;
  const hasReplyDraft = replyDraft.trim().length > 0;
  const hasAnyEnrichment = email.sentiment_confidence > 0 || email.intent_confidence > 0 || hasOrderData || hasDraftOrder || hasReplyDraft;
  const hasAttachments = email.attachments && email.attachments.length > 0;

  return (
    <div className="flex-1 flex min-h-0">
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
          {hasAttachments && (
            <button
              onClick={() => setShowAttachments(!showAttachments)}
              className="mt-3 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span className="group-hover:underline">
                {email.attachments!.length} attachment{email.attachments!.length > 1 ? "s" : ""}
              </span>
              {!showAttachments && (
                <span className="text-primary text-[11px] font-medium">View</span>
              )}
            </button>
          )}
        </div>

        {/* AI Analysis — always shown */}
        <AIAnalysisPanel email={email} />

        {/* Extracted Order Data — from email parsing */}
        {hasOrderData && (
          <OrderDataTable items={orderItems} />
        )}

        {/* Draft Order — from recommended SKUs */}
        {hasDraftOrder && (
          <DraftOrder recommendedSkus={email.recommended_skus} extractedOrderItems={email.extracted_order} onTotalChange={handleTotalChange} onItemsChange={handleItemsChange} />
        )}

        {/* AI Reply — only when a draft exists */}
        {hasReplyDraft && (
          <AIReplyEditor emailId={email.id} draft={replyDraft} onChange={setReplyDraft} />
        )}

        {/* Actions — only when there's enrichment data to act on */}
        {hasAnyEnrichment && (
          <ActionButtons email={email} replyDraft={replyDraft} selectedTone={selectedTone} onStatusChange={onStatusChange} orderTotal={orderTotal} draftOrderItems={draftOrderItems} />
        )}
      </div>

      {/* Attachments Side Panel */}
      {showAttachments && hasAttachments && (
        <AttachmentsPanel
          attachments={email.attachments!}
          attachmentsMeta={email.attachmentsMeta}
          onClose={() => setShowAttachments(false)}
        />
      )}
    </div>
  );
}
