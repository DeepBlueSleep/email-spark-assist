import { useState } from "react";
import { Email, Status } from "@/data/mockData";
import { Check, Edit, HelpCircle, XCircle } from "lucide-react";

interface ActionButtonsProps {
  email: Email;
  onStatusChange: (id: string, status: Status) => void;
}

export function ActionButtons({ email, onStatusChange }: ActionButtonsProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [clarificationMsg, setClarificationMsg] = useState(
    `Dear ${email.customer_name},\n\nThank you for your email. We need some additional information to process your request:\n\n- [Please specify details]\n\nCould you please provide these details at your earliest convenience?\n\nBest regards,\nOrder Processing Team`
  );

  return (
    <div className="bg-card rounded-xl shadow-card p-6">
      <h3 className="font-semibold mb-4">Actions</h3>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sentiment-positive text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <Check className="w-4 h-4" /> Approve & Send
        </button>
        <button
          onClick={() => onStatusChange(email.id, "Awaiting Review")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-accent transition-colors"
        >
          <Edit className="w-4 h-4" /> Edit Before Sending
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

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="bg-card rounded-xl shadow-elevated p-6 max-w-md w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-semibold mb-2">Confirm Send</h4>
            <p className="text-sm text-muted-foreground mb-4">Are you sure you want to approve and send this reply to {email.customer_name}?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent">Cancel</button>
              <button
                onClick={() => { onStatusChange(email.id, "Replied"); setShowConfirm(false); }}
                className="px-4 py-2 text-sm rounded-lg bg-sentiment-positive text-primary-foreground hover:opacity-90"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request More Info Modal */}
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
              <button
                onClick={() => { onStatusChange(email.id, "Awaiting Customer"); setShowRequestInfo(false); }}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
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
                onClick={() => { if (escalateReason.trim()) { onStatusChange(email.id, "Escalated"); setShowEscalate(false); } }}
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
