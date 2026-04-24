import { useState, useCallback } from "react";
import { Email, Status, ExtractedOrderItem } from "@/data/mockData";
import { AIAnalysisPanel } from "./AIAnalysisPanel";
import { OrderDataTable } from "./OrderDataTable";
import { DraftOrder } from "./DraftOrder";
import type { DraftOrderItem } from "./DraftOrder";
import { AIReplyEditor } from "./AIReplyEditor";
import { ActionButtons } from "./ActionButtons";
import { AttachmentsPanel } from "./AttachmentsPanel";
import { CreateCustomerDialog } from "./CreateCustomerDialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { User, Clock, Paperclip, ShieldCheck, ShieldAlert, ShieldQuestion, UserPlus, Loader2 } from "lucide-react";
import { invokeFunction } from "@/lib/api";
import { toast } from "sonner";
import { EmailBody } from "./EmailBody";

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




  const hasOrderData = email.extracted_order.length > 0;
  const hasDraftOrder = email.recommended_skus.length > 0;
  const hasReplyDraft = replyDraft.trim().length > 0;
  const hasAnyEnrichment = email.sentiment_confidence > 0 || email.intent_confidence > 0 || hasOrderData || hasDraftOrder || hasReplyDraft;
  const hasAttachments = email.attachments && email.attachments.length > 0;
  const isBoxx = email.customer?.is_boxx || email.customer_name.startsWith("BOXX -");

  // Credit health visibility
  const creditRelevantIntents = ["Order Creation", "Order Change", "Credit Enquiry"];
  const isCreditRelevant = creditRelevantIntents.includes(email.intent);
  const hasCustomer = !!email.customer;
  const creditLimit = Number(email.customer?.credit_limit ?? 0);
  const creditUsed = Number(email.customer?.credit_used ?? 0);
  const hasCreditHistory = hasCustomer && creditLimit > 0;
  const projected = creditUsed + (orderTotal || 0);
  const overLimit = hasCreditHistory && projected > creditLimit;
  const utilization = creditLimit > 0 ? Math.min(100, Math.round((projected / creditLimit) * 100)) : 0;
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [initializingCredit, setInitializingCredit] = useState(false);

  const handleCreateCustomer = () => {
    setShowCreateCustomer(true);
  };

  const handleCustomerCreated = () => {
    // Reload to refresh the linked customer record on this email
    setTimeout(() => window.location.reload(), 400);
  };

  const handleInitializeCredit = async () => {
    if (!email.customer) return;
    setInitializingCredit(true);
    try {
      await invokeFunction("api-customers", {
        method: "PATCH",
        body: {
          id: email.customer.id,
          credit_limit: 0,
          credit_used: 0,
          credit_terms: email.customer.credit_terms || "Net 30",
        },
      });
      toast.success("Credit history initialized. Set a limit in Customers to enable orders.");
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast.error(`Failed to initialize credit: ${e.message || e}`);
    } finally {
      setInitializingCredit(false);
    }
  };

  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-fade-in">
        {/* Original Email Card */}
        <div className="bg-card rounded-xl shadow-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{email.subject}</h2>
                {isBoxx && (
                  <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0">BOXX</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{email.customer_name}</span>
                <span className="text-xs">{email.email}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(email.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4 max-h-60 overflow-y-auto">
            <div
              className="email-body text-sm leading-relaxed text-foreground/90 [&_a]:text-primary [&_a]:underline [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_img]:max-w-full [&_img]:h-auto [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-1 [&_th]:border [&_th]:border-border [&_th]:p-1"
              dangerouslySetInnerHTML={{ __html: renderEmailBody(email.body) }}
            />
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

        {/* Credit Health — for credit-relevant intents, or whenever the sender is unknown so they can be added */}
        {(isCreditRelevant || !hasCustomer) && (
          hasCreditHistory ? (
            <div className={`rounded-xl border p-4 shadow-card ${overLimit ? "bg-destructive/5 border-destructive/30" : "bg-emerald-500/5 border-emerald-500/30"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {overLimit ? (
                    <ShieldAlert className="w-5 h-5 text-destructive mt-0.5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">Credit Health</h3>
                      <Badge
                        variant="outline"
                        className={overLimit
                          ? "bg-destructive/10 text-destructive border-destructive/40 text-[10px] px-1.5 py-0"
                          : "bg-emerald-500/10 text-emerald-700 border-emerald-500/40 text-[10px] px-1.5 py-0"}
                      >
                        {overLimit ? "Over Limit" : "Within Limit"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fmt(creditUsed)} used
                      {orderTotal > 0 && <> + {fmt(orderTotal)} draft</>}
                      {" "}of {fmt(creditLimit)} limit
                      {email.customer?.credit_terms && <> · {email.customer.credit_terms}</>}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-lg font-semibold tabular-nums ${overLimit ? "text-destructive" : "text-emerald-700"}`}>
                    {utilization}%
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Utilization</div>
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all ${overLimit ? "bg-destructive" : "bg-emerald-500"}`}
                  style={{ width: `${utilization}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border p-4 shadow-card bg-amber-500/5 border-amber-500/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldQuestion className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">Credit Health</h3>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/40 text-[10px] px-1.5 py-0">
                        {hasCustomer ? "No Credit History" : "No Customer Record"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {hasCustomer
                        ? "Customer exists but has no credit limit set. Initialize an empty credit history to begin tracking."
                        : "This sender is not in the customer database. Create a record with an empty credit history before approving any orders."}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  {hasCustomer ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleInitializeCredit}
                      disabled={initializingCredit}
                      className="border-amber-500/40 hover:bg-amber-500/10"
                    >
                      {initializingCredit ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Initialize Credit History
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCreateCustomer}
                      className="border-amber-500/40 hover:bg-amber-500/10"
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                      Create Customer Record
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        )}

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

      {/* Create Customer dialog */}
      <CreateCustomerDialog
        open={showCreateCustomer}
        onOpenChange={setShowCreateCustomer}
        defaultName={email.customer_name || ""}
        defaultEmail={email.email}
        onCreated={handleCustomerCreated}
      />
    </div>
  );
}
