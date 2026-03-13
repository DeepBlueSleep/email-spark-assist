import { useState, useEffect } from "react";
import { Email, Status } from "@/data/mockData";
import type { DraftOrderItem } from "./DraftOrder";
import { Check, HelpCircle, XCircle, Send, Loader2, AlertTriangle, ShieldCheck, Ban } from "lucide-react";
import { invokeFunction } from "@/lib/api";
import { toast } from "sonner";

interface ActionButtonsProps {
  email: Email;
  replyDraft: string;
  selectedTone: string;
  onStatusChange: (id: string, status: Status) => void;
  orderTotal?: number;
  draftOrderItems?: DraftOrderItem[];
}

interface CreditCheckResult {
  status: "ok" | "warning" | "exceeded";
  credit_limit: number;
  credit_used: number;
  credit_remaining: number;
  order_total: number;
  message: string;
}

export function ActionButtons({ email, replyDraft, selectedTone, onStatusChange, orderTotal = 0, draftOrderItems = [] }: ActionButtonsProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [creditCheck, setCreditCheck] = useState<CreditCheckResult | null>(null);
  const [checkingCredit, setCheckingCredit] = useState(false);
  const [clarificationMsg, setClarificationMsg] = useState(
    `Dear ${email.customer_name},\n\nThank you for your email. We need some additional information to process your request:\n\n- [Please specify details]\n\nCould you please provide these details at your earliest convenience?\n\nBest regards,\nOrder Processing Team`
  );

  // Simulate credit check when confirm dialog opens
  useEffect(() => {
    if (!showConfirm) {
      setCreditCheck(null);
      return;
    }
    async function runCreditCheck() {
      setCheckingCredit(true);
      try {
        const data = await invokeFunction("api-customers", { params: { email: email.email } });
        const customer = data.customers?.[0];

        // Simulate a short delay like an API would have
        await new Promise((r) => setTimeout(r, 600));

        if (customer) {
          const limit = customer.credit_limit || 0;
          const used = customer.credit_used || 0;
          const remaining = limit - used;
          const newUsed = used + orderTotal;

          let status: CreditCheckResult["status"] = "ok";
          let message = `Credit OK. Remaining after this order: $${(remaining - orderTotal).toFixed(2)}`;

          if (limit > 0 && newUsed > limit) {
            status = "exceeded";
            message = `Credit limit exceeded! This order ($${orderTotal.toFixed(2)}) would bring usage to $${newUsed.toFixed(2)} against a $${limit.toFixed(2)} limit. Overage: $${(newUsed - limit).toFixed(2)}`;
          } else if (limit > 0 && remaining - orderTotal < limit * 0.2) {
            status = "warning";
            message = `Credit warning: After this order, only $${(remaining - orderTotal).toFixed(2)} (${Math.round(((remaining - orderTotal) / limit) * 100)}%) of credit remains.`;
          }

          setCreditCheck({ status, credit_limit: limit, credit_used: used, credit_remaining: remaining, order_total: orderTotal, message });
        } else {
          setCreditCheck({ status: "warning", credit_limit: 0, credit_used: 0, credit_remaining: 0, order_total: orderTotal, message: "No customer profile found — credit terms not verified." });
        }
      } catch {
        setCreditCheck({ status: "warning", credit_limit: 0, credit_used: 0, credit_remaining: 0, order_total: orderTotal, message: "Could not verify credit — proceeding at your discretion." });
      }
      setCheckingCredit(false);
    }
    runCreditCheck();
  }, [showConfirm, email.email, orderTotal]);

  const isCreditExceeded = creditCheck?.status === "exceeded";

  const handleApproveAndSend = async () => {
    if (isCreditExceeded) return;
    setIsSending(true);
    try {
      // Build payload with all quotation data
      const payload = {
        email_id: email.id,
        customer_name: email.customer_name,
        customer_email: email.email,
        customer_id: email.customer_id || null,
        subject: email.subject,
        intent: email.intent,
        sentiment: email.sentiment,
        reply_tone: selectedTone,
        reply_draft: replyDraft,
        order_total: orderTotal,
        order_items: draftOrderItems.map((item) => ({
          sku_code: item.sku_code,
          name: item.name,
          category: item.category,
          color: item.color,
          size: item.size,
          price: item.price,
          quantity: item.quantity,
          line_total: item.price * item.quantity,
        })),
        credit_check: creditCheck ? {
          status: creditCheck.status,
          credit_limit: Number(creditCheck.credit_limit),
          credit_used: Number(creditCheck.credit_used),
          order_total: Number(creditCheck.order_total),
        } : null,
        approved_at: new Date().toISOString(),
      };

      // Post to n8n webhook
      try {
        await fetch("https://n8n.srv1031900.hstgr.cloud/webhook-test/b32920d4-7c8a-4b20-b0e1-b05d88858f7c", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (webhookErr) {
        console.warn("Webhook post failed (non-blocking):", webhookErr);
      }

      // Update email status
      await invokeFunction("api-emails", {
        method: "PATCH",
        body: { id: email.id, status: "Replied", ai_reply_draft: replyDraft },
      });
      onStatusChange(email.id, "Replied");
      toast.success(`Quotation sent to ${email.customer_name} (${selectedTone} tone)`);
      setShowConfirm(false);
    } catch (err) {
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const handleRequestInfo = async () => {
    try {
      await invokeFunction("api-emails", {
        method: "PATCH",
        body: { id: email.id, status: "Awaiting Customer" },
      });
      onStatusChange(email.id, "Awaiting Customer");
      toast.success("Information request sent");
      setShowRequestInfo(false);
    } catch {
      toast.error("Failed to send request");
    }
  };

  const handleEscalate = async () => {
    if (!escalateReason.trim()) return;
    try {
      await invokeFunction("api-emails", {
        method: "PATCH",
        body: { id: email.id, status: "Escalated" },
      });
      onStatusChange(email.id, "Escalated");
      toast.success("Email escalated");
      setShowEscalate(false);
    } catch {
      toast.error("Failed to escalate");
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-6">
      <h3 className="font-semibold mb-4">Actions</h3>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sentiment-positive text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <Send className="w-4 h-4" /> Approve & Send
        </button>
        <button
          onClick={() => setShowRequestInfo(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-status-awaiting/30 text-status-awaiting font-medium text-sm hover:bg-status-awaiting/5 transition-colors"
        >
          <HelpCircle className="w-4 h-4" /> Request More Info
        </button>
        <button
          onClick={() => setShowEscalate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-destructive/30 text-destructive font-medium text-sm hover:bg-destructive/5 transition-colors"
        >
          <XCircle className="w-4 h-4" /> Reject / Escalate
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="bg-card rounded-xl shadow-elevated p-6 max-w-lg w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-semibold mb-2">Confirm & Send Reply</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Send this <span className="font-medium text-foreground">{selectedTone}</span> reply to <span className="font-medium text-foreground">{email.customer_name}</span>?
            </p>

            {/* Credit Check Result */}
            {orderTotal > 0 && (
              <div className="mb-4">
                {checkingCredit ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Checking credit terms…
                  </div>
                ) : creditCheck && (
                  <div className={`rounded-lg p-3 text-xs space-y-1.5 ${
                    creditCheck.status === "exceeded"
                      ? "bg-destructive/10 border border-destructive/20"
                      : creditCheck.status === "warning"
                      ? "bg-amber-500/10 border border-amber-500/20"
                      : "bg-sentiment-positive/10 border border-sentiment-positive/20"
                  }`}>
                    <div className="flex items-center gap-2 font-semibold">
                      {creditCheck.status === "exceeded" ? (
                        <><AlertTriangle className="w-4 h-4 text-destructive" /><span className="text-destructive">Credit Limit Exceeded</span></>
                      ) : creditCheck.status === "warning" ? (
                        <><AlertTriangle className="w-4 h-4 text-amber-600" /><span className="text-amber-600">Credit Warning</span></>
                      ) : (
                        <><ShieldCheck className="w-4 h-4 text-sentiment-positive" /><span className="text-sentiment-positive">Credit Check Passed</span></>
                      )}
                    </div>
                    <p className="text-muted-foreground">{creditCheck.message}</p>
                    {creditCheck.credit_limit > 0 && (
                      <div className="flex gap-4 pt-1 text-muted-foreground">
                        <span>Limit: <span className="font-medium text-foreground">${Number(creditCheck.credit_limit).toFixed(2)}</span></span>
                        <span>Used: <span className="font-medium text-foreground">${Number(creditCheck.credit_used).toFixed(2)}</span></span>
                        <span>Order: <span className="font-medium text-foreground">${Number(creditCheck.order_total).toFixed(2)}</span></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="bg-secondary/50 rounded-lg p-4 max-h-48 overflow-y-auto mb-4">
              <pre className="text-xs whitespace-pre-wrap font-sans text-foreground/80">{replyDraft}</pre>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent">Cancel</button>
              {isCreditExceeded ? (
                <div className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20 cursor-not-allowed">
                  <Ban className="w-4 h-4" /> Blocked — Credit Exceeded
                </div>
              ) : (
                <button
                  onClick={handleApproveAndSend}
                  disabled={isSending || checkingCredit}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-sentiment-positive text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirm & Send
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showRequestInfo && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowRequestInfo(false)}>
          <div className="bg-card rounded-xl shadow-elevated p-6 max-w-lg w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-semibold mb-2">Request More Information</h4>
            <textarea
              value={clarificationMsg}
              onChange={(e) => setClarificationMsg(e.target.value)}
              rows={8}
              className="w-full text-sm p-3 rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20 resize-y"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowRequestInfo(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent">Cancel</button>
              <button onClick={handleRequestInfo} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {showEscalate && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowEscalate(false)}>
          <div className="bg-card rounded-xl shadow-elevated p-6 max-w-md w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-semibold mb-2">Reject / Escalate</h4>
            <p className="text-sm text-muted-foreground mb-3">Please provide a reason for escalation:</p>
            <textarea
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              rows={3}
              placeholder="Enter reason..."
              className="w-full text-sm p-3 rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20 resize-y"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowEscalate(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent">Cancel</button>
              <button
                onClick={handleEscalate}
                className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                disabled={!escalateReason.trim()}
              >
                Escalate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
