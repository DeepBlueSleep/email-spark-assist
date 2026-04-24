import { useState, useEffect } from "react";
import { Email, Status } from "@/data/mockData";
import type { DraftOrderItem } from "./DraftOrder";
import { Check, HelpCircle, XCircle, Send, Loader2, AlertTriangle, ShieldCheck, Ban, UserPlus } from "lucide-react";
import { invokeFunction } from "@/lib/api";
import { pushApprovedOrder, pushRequestInfo, pushEscalation, pushStockInProcess } from "@/lib/autocount";
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
  status: "ok" | "warning" | "exceeded" | "unknown";
  credit_limit: number;
  credit_used: number;
  credit_remaining: number;
  order_total: number;
  message: string;
  customer_id?: string | null;
}

export function ActionButtons({ email, replyDraft, selectedTone, onStatusChange, orderTotal = 0, draftOrderItems = [] }: ActionButtonsProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [showStockReview, setShowStockReview] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isFilingStock, setIsFilingStock] = useState(false);
  const [creditCheck, setCreditCheck] = useState<CreditCheckResult | null>(null);
  const [checkingCredit, setCheckingCredit] = useState(false);
  const [overrideAcknowledged, setOverrideAcknowledged] = useState(false);
  const [clarificationMsg, setClarificationMsg] = useState(
    `Dear ${email.customer_name},\n\nThank you for your email. We need some additional information to process your request:\n\n- [Please specify details]\n\nCould you please provide these details at your earliest convenience?\n\nBest regards,\nOrder Processing Team`
  );

  // Stock availability check — any draft item where requested qty exceeds stock_level (or stock is 0)
  const insufficientStockItems = draftOrderItems.filter(
    (it) => it.stock_level <= 0 || it.quantity > it.stock_level || it.requested_quantity > it.stock_level
  );
  const hasStockIssue = insufficientStockItems.length > 0;

  const creditRelevantIntents = ["Order Creation", "Order Change", "Credit Enquiry"];
  const isCreditRelevant = creditRelevantIntents.includes(email.intent);
  const customerCreditLimit = Number(email.customer?.credit_limit ?? 0);
  const needsCreditSetup = isCreditRelevant && (!email.customer || customerCreditLimit <= 0);

  // Simulate credit check when confirm dialog opens
  useEffect(() => {
    if (!showConfirm) {
      setCreditCheck(null);
      setOverrideAcknowledged(false);
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
          const limit = Number(customer.credit_limit) || 0;
          const used = Number(customer.credit_used) || 0;
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

          setCreditCheck({ status, credit_limit: limit, credit_used: used, credit_remaining: remaining, order_total: orderTotal, message, customer_id: customer.id });
        } else {
          setCreditCheck({
            status: "unknown",
            credit_limit: 0,
            credit_used: 0,
            credit_remaining: 0,
            order_total: orderTotal,
            message: `No customer profile found for ${email.email}. Confirming will create a new customer record with this order ($${orderTotal.toFixed(2)}) charged against their account.`,
            customer_id: null,
          });
        }
      } catch {
        setCreditCheck({ status: "warning", credit_limit: 0, credit_used: 0, credit_remaining: 0, order_total: orderTotal, message: "Could not verify credit — proceeding at your discretion." });
      }
      setCheckingCredit(false);
    }
    runCreditCheck();
  }, [showConfirm, email.email, orderTotal]);

  const isCreditExceeded = creditCheck?.status === "exceeded";
  const requiresOverride = isCreditExceeded && !overrideAcknowledged;

  const handleApproveAndSend = async () => {
    if (requiresOverride) return;
    setIsSending(true);
    try {
      let resolvedCustomerId = email.customer_id || creditCheck?.customer_id || null;
      let resolvedCustomerCode = email.customer?.code || null;

      // If no customer mapped, create one now and charge the order against their fresh account
      if (creditCheck?.status === "unknown") {
        try {
          const created = await invokeFunction("api-customers", {
            method: "POST",
            body: {
              name: email.customer_name || "Unknown",
              email: email.email,
              credit_limit: 0,
              credit_used: orderTotal,
              credit_terms: "Net 30",
              notes: `Auto-created from email approval on ${new Date().toISOString().slice(0, 10)}`,
            },
          });
          resolvedCustomerId = created.customer?.id || null;
          resolvedCustomerCode = created.customer?.code || null;
          // Link the email to the new customer record
          if (resolvedCustomerId) {
            await invokeFunction("api-emails", {
              method: "PATCH",
              body: { id: email.id, customer_id: resolvedCustomerId },
            }).catch(() => {});
          }
          toast.success(`New customer profile created for ${email.customer_name}`);
        } catch (custErr) {
          console.warn("Failed to auto-create customer:", custErr);
          toast.error("Could not create customer profile — order will still send");
        }
      } else if (resolvedCustomerId && orderTotal > 0) {
        // Existing customer: increment credit_used by the new order amount
        const newUsed = (Number(creditCheck?.credit_used) || 0) + orderTotal;
        await invokeFunction("api-customers", {
          method: "PATCH",
          body: { id: resolvedCustomerId, credit_used: newUsed },
        }).catch((e) => console.warn("Failed to update credit_used:", e));
      }

      // Push approved order to Autocount (stub — endpoint not live yet)
      await pushApprovedOrder({
        email_id: email.id,
        customer_code: resolvedCustomerCode,
        customer_name: email.customer_name,
        customer_email: email.email,
        subject: email.subject,
        intent: email.intent,
        triggered_at: new Date().toISOString(),
        reply_tone: selectedTone,
        reply_draft: replyDraft,
        order_total: orderTotal,
        order_items: draftOrderItems.map((item) => ({
          ItemCode: item.sku_code,
          Description: item.name,
          Qty: item.quantity,
          UnitPrice: item.price,
        })),
        credit_check: creditCheck ? {
          status: creditCheck.status,
          credit_limit: Number(creditCheck.credit_limit),
          credit_used: Number(creditCheck.credit_used),
          order_total: Number(creditCheck.order_total),
        } : null,
      });

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
      // Log info-request activity to Autocount (stub — endpoint not live yet)
      await pushRequestInfo({
        email_id: email.id,
        customer_code: email.customer?.code || null,
        customer_name: email.customer_name,
        customer_email: email.email,
        subject: email.subject,
        intent: email.intent,
        triggered_at: new Date().toISOString(),
        message: clarificationMsg,
      });

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

    // Fire-and-forget the autocount workflow log (non-blocking)
    pushEscalation({
      email_id: email.id,
      customer_code: email.customer?.code || null,
      customer_name: email.customer_name,
      customer_email: email.email,
      subject: email.subject,
      intent: email.intent,
      triggered_at: new Date().toISOString(),
      reason: escalateReason,
    }).catch((e) => console.warn("autocount escalate log failed:", e));

    // Optimistic UI update — user sees the change immediately
    try { onStatusChange(email.id, "Escalated"); } catch (e) { console.warn("onStatusChange threw:", e); }
    toast.success("Email escalated");
    setShowEscalate(false);

    // Persist status — retry once on transient network error
    const persist = () =>
      invokeFunction("api-emails", {
        method: "PATCH",
        body: { id: email.id, status: "Escalated" },
      });

    try {
      await persist();
    } catch (err1) {
      console.warn("Escalate persist attempt 1 failed, retrying:", err1);
      try {
        await new Promise((r) => setTimeout(r, 600));
        await persist();
      } catch (err2) {
        console.error("Escalate persist failed after retry:", err2);
        toast.error(`Status saved locally but couldn't sync: ${err2 instanceof Error ? err2.message : "network error"}`);
      }
    }
  };

  const actionedStatuses: Status[] = ["Replied", "Awaiting Customer", "Escalated"];
  const isActioned = actionedStatuses.includes(email.status);

  if (isActioned) {
    const label =
      email.status === "Replied"
        ? "Reply sent — no further action needed"
        : email.status === "Awaiting Customer"
        ? "Information requested — awaiting customer response"
        : "Escalated — handled outside this workflow";
    const Icon =
      email.status === "Replied" ? Check : email.status === "Awaiting Customer" ? HelpCircle : XCircle;
    const tone =
      email.status === "Replied"
        ? "text-sentiment-positive bg-sentiment-positive/10 border-sentiment-positive/20"
        : email.status === "Awaiting Customer"
        ? "text-status-awaiting bg-status-awaiting/10 border-status-awaiting/30"
        : "text-destructive bg-destructive/10 border-destructive/20";
    return (
      <div className="bg-card rounded-xl shadow-card p-6">
        <h3 className="font-semibold mb-4">Actions</h3>
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${tone}`}>
          <Icon className="w-4 h-4" />
          {label}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card p-6">
      <h3 className="font-semibold mb-4">Actions</h3>

      <div className="flex items-center gap-3 flex-wrap">
        {needsCreditSetup ? (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted text-muted-foreground font-medium text-sm cursor-not-allowed"
            title={!email.customer ? "Create a customer record first" : "Initialize this customer's credit history first"}
          >
            <Ban className="w-4 h-4" /> Approve & Send — {email.customer ? "Credit Setup Required" : "No Customer Record"}
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sentiment-positive text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Send className="w-4 h-4" /> Approve & Send
          </button>
        )}
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
      {needsCreditSetup && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">
          ⚠ {email.customer
            ? "This customer has no credit history. Use the Credit Health card above to initialize before approving."
            : "This sender is not in the customer database. Use the Credit Health card above to create a record before approving."}
        </p>
      )}

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
                      : creditCheck.status === "unknown"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-sentiment-positive/10 border border-sentiment-positive/20"
                  }`}>
                    <div className="flex items-center gap-2 font-semibold">
                      {creditCheck.status === "exceeded" ? (
                        <><AlertTriangle className="w-4 h-4 text-destructive" /><span className="text-destructive">Credit Limit Exceeded</span></>
                      ) : creditCheck.status === "warning" ? (
                        <><AlertTriangle className="w-4 h-4 text-amber-600" /><span className="text-amber-600">Credit Warning</span></>
                      ) : creditCheck.status === "unknown" ? (
                        <><UserPlus className="w-4 h-4 text-primary" /><span className="text-primary">New Customer — Will Be Created</span></>
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
            {isCreditExceeded && (
              <div className="mb-4 rounded-lg border-2 border-destructive bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <input
                    id="credit-override"
                    type="checkbox"
                    checked={overrideAcknowledged}
                    onChange={(e) => setOverrideAcknowledged(e.target.checked)}
                    className="mt-0.5 accent-destructive"
                  />
                  <label htmlFor="credit-override" className="text-xs text-destructive font-medium leading-snug cursor-pointer">
                    I acknowledge this order <span className="underline">exceeds the customer's credit limit</span> and accept responsibility for approving it. The overage will be charged against their account.
                  </label>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent">Cancel</button>
              {isCreditExceeded ? (
                <button
                  onClick={handleApproveAndSend}
                  disabled={isSending || checkingCredit || requiresOverride}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md ring-2 ring-destructive/30"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Override & Send Anyway
                </button>
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
