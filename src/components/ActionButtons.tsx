import { useState, useEffect } from "react";
import { Email, Status } from "@/data/mockData";
import type { DraftOrderItem } from "./DraftOrder";
import { Check, HelpCircle, XCircle, Send, Loader2, AlertTriangle, ShieldCheck, Ban, UserPlus } from "lucide-react";
import { invokeFunction } from "@/lib/api";
import { logClientAudit } from "@/lib/audit";
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
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [showStockReview, setShowStockReview] = useState(false);
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
    setIsSending(true);
    try {
      // Stub: HTTP request to Autocount API (not wired to a real endpoint yet)
      const autocountPayload = {
        email_id: email.id,
        customer_code: email.customer?.code || null,
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
      };

      try {
        await fetch("https://api.autocount.example.com/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(autocountPayload),
        });
      } catch (httpErr) {
        // Endpoint not live yet — log and continue
        console.info("[Autocount stub] would POST:", autocountPayload, httpErr);
      }

      // Update email status
      await invokeFunction("api-emails", {
        method: "PATCH",
        body: { id: email.id, status: "Replied", ai_reply_draft: replyDraft },
      });
      onStatusChange(email.id, "Replied");
      toast.success(`Order sent to Autocount for ${email.customer_name}`);
      logClientAudit({
        action: "approve_and_send_to_autocount",
        target_type: "email",
        target_id: email.id,
        status: "success",
        request: autocountPayload,
        metadata: { customer_email: email.email, order_total: orderTotal },
      });
      setShowConfirm(false);
    } catch (err) {
      toast.error("Failed to send order");
      logClientAudit({
        action: "approve_and_send_to_autocount",
        target_type: "email",
        target_id: email.id,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
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


  const handleStockInProcess = async () => {
    setIsFilingStock(true);
    try {
      pushStockInProcess({
        email_id: email.id,
        customer_code: email.customer?.code || null,
        customer_name: email.customer_name,
        customer_email: email.email,
        subject: email.subject,
        intent: email.intent,
        triggered_at: new Date().toISOString(),
        order_total: orderTotal,
        insufficient_items: insufficientStockItems.map((it) => ({
          ItemCode: it.sku_code,
          Description: it.name,
          Requested: it.requested_quantity,
          Available: it.stock_level,
          Shortfall: Math.max(0, it.requested_quantity - it.stock_level),
        })),
      }).catch((e) => console.warn("autocount stock-in-process log failed:", e));

      onStatusChange(email.id, "Stock In Process");
      await invokeFunction("api-emails", {
        method: "PATCH",
        body: { id: email.id, status: "Stock In Process" },
      });
      toast.success(`Stock-in-process case opened for admin review (${insufficientStockItems.length} item${insufficientStockItems.length !== 1 ? "s" : ""})`);
      setShowStockReview(false);
    } catch (err) {
      toast.error("Failed to file stock-in-process case");
    } finally {
      setIsFilingStock(false);
    }
  };

  const actionedStatuses: Status[] = ["Replied", "Awaiting Customer", "Escalated", "Stock In Process"];
  const isActioned = actionedStatuses.includes(email.status);

  if (isActioned) {
    const label =
      email.status === "Replied"
        ? "Reply sent — no further action needed"
        : email.status === "Awaiting Customer"
        ? "Information requested — awaiting customer response"
        : email.status === "Stock In Process"
        ? "Stock-in-process case opened — awaiting admin restock review"
        : "Escalated — handled outside this workflow";
    const Icon =
      email.status === "Replied" ? Check
        : email.status === "Awaiting Customer" ? HelpCircle
        : email.status === "Stock In Process" ? AlertTriangle
        : XCircle;
    const tone =
      email.status === "Replied"
        ? "text-sentiment-positive bg-sentiment-positive/10 border-sentiment-positive/20"
        : email.status === "Awaiting Customer"
        ? "text-status-awaiting bg-status-awaiting/10 border-status-awaiting/30"
        : email.status === "Stock In Process"
        ? "text-amber-700 bg-amber-500/10 border-amber-500/30"
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
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-sentiment-positive text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Send className="w-4 h-4" />
          Approve and Send to Autocount
        </button>
        <button
          onClick={async () => {
            onStatusChange(email.id, "Escalated");
            try {
              await invokeFunction("api-emails", {
                method: "PATCH",
                body: { id: email.id, status: "Escalated" },
              });
              toast.success("Email rejected");
              logClientAudit({
                action: "reject_email",
                target_type: "email",
                target_id: email.id,
                status: "success",
                metadata: { customer_email: email.email },
              });
            } catch {
              toast.error("Failed to reject email");
              logClientAudit({
                action: "reject_email",
                target_type: "email",
                target_id: email.id,
                status: "error",
              });
            }
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm border border-destructive/30 text-destructive bg-card hover:bg-destructive/10 transition-colors"
        >
          <Ban className="w-4 h-4" />
          Reject
        </button>
      </div>

      {showStockReview && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowStockReview(false)}>
          <div className="bg-card rounded-xl shadow-elevated p-6 max-w-lg w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h4 className="text-lg font-semibold">Open Stock-In-Process Case</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              The following items don't have enough stock to fulfil this order. Filing this case will route it to admin for restock review and notify the customer that their order is being processed.
            </p>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 max-h-56 overflow-y-auto mb-4 space-y-2">
              {insufficientStockItems.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-xs">
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-muted-foreground font-mono text-[10px]">{it.sku_code}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-700 font-semibold">Requested {it.requested_quantity}</div>
                    <div className="text-muted-foreground">Available {it.stock_level} · Short {Math.max(0, it.requested_quantity - it.stock_level)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowStockReview(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent">Cancel</button>
              <button
                onClick={handleStockInProcess}
                disabled={isFilingStock}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {isFilingStock ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                Open Stock-In-Process Case
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="bg-card rounded-xl shadow-elevated p-6 max-w-lg w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-semibold mb-2">Send Order to Autocount</h4>
            <p className="text-sm text-muted-foreground mb-3">
              This will submit the approved order for <span className="font-medium text-foreground">{email.customer_name}</span> to the Autocount API and send the <span className="font-medium text-foreground">{selectedTone}</span> reply.
            </p>

            <div className="bg-secondary/50 rounded-lg p-4 max-h-48 overflow-y-auto mb-4">
              <pre className="text-xs whitespace-pre-wrap font-sans text-foreground/80">{replyDraft}</pre>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent">Cancel</button>
              <button
                onClick={handleApproveAndSend}
                disabled={isSending}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-sentiment-positive text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Approve and Send to Autocount
              </button>
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

    </div>
  );
}
