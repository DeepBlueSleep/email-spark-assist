import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { invokeFunction } from "@/lib/api";
import { toast } from "sonner";

export interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
  defaultEmail?: string;
  onCreated?: (customer: any) => void;
}

const CREDIT_TERM_OPTIONS = [
  "C.O.D.",
  "Net 7",
  "Net 14",
  "Net 30",
  "Net 60",
  "Net 90",
  "F.O.C",
];

export function CreateCustomerDialog({
  open,
  onOpenChange,
  defaultName = "",
  defaultEmail = "",
  onCreated,
}: CreateCustomerDialogProps) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [creditLimit, setCreditLimit] = useState<string>("0");
  const [creditTerms, setCreditTerms] = useState("Net 30");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Re-sync defaults when dialog opens with new context
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(defaultName);
      setEmail(defaultEmail);
      setCompany("");
      setPhone("");
      setCode("");
      setCreditLimit("0");
      setCreditTerms("Net 30");
      setNotes("");
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("A valid email is required");
      return;
    }
    const limitNum = Number(creditLimit);
    if (Number.isNaN(limitNum) || limitNum < 0) {
      toast.error("Credit limit must be a non-negative number");
      return;
    }

    setSubmitting(true);
    try {
      const result = await invokeFunction("api-customers", {
        method: "POST",
        body: {
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || null,
          phone: phone.trim() || null,
          code: code.trim() || null,
          credit_limit: limitNum,
          credit_used: 0,
          credit_terms: creditTerms,
          notes: notes.trim() || null,
        },
      });
      toast.success(`Customer "${name}" created`);
      onCreated?.(result?.customer);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Failed to create customer: ${e?.message || e}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Create Customer Record
          </DialogTitle>
          <DialogDescription>
            Enter the key details for this customer. Credit terms and limit are required for order approvals.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="cust-name">Name *</Label>
            <Input id="cust-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="cust-email">Email *</Label>
            <Input id="cust-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cust-company">Company</Label>
            <Input id="cust-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Sdn Bhd" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cust-phone">Phone</Label>
            <Input id="cust-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+60 12 345 6789" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cust-code">Debtor Code</Label>
            <Input id="cust-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. A169" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cust-terms">Credit Terms *</Label>
            <Select value={creditTerms} onValueChange={setCreditTerms}>
              <SelectTrigger id="cust-terms">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_TERM_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="cust-limit">Credit Limit (USD) *</Label>
            <Input
              id="cust-limit"
              type="number"
              min="0"
              step="100"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="0"
            />
            <p className="text-[11px] text-muted-foreground">Set to 0 for cash-only / no credit extended.</p>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="cust-notes">Notes</Label>
            <Textarea
              id="cust-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional context about this customer"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1.5" />}
            Create Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
