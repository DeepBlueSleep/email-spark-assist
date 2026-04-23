import { useState, useMemo } from "react";
import { Email, Sentiment, Intent, Status } from "@/data/mockData";
import { StatusDef } from "@/hooks/useStatuses";
import {
  Search, Filter, Mail, ChevronDown, Paperclip, Archive, ArchiveRestore,
  ChevronLeft, Trash2, MailOpen, X,
} from "lucide-react";
import { cn, formatLabel } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const sentimentDotClass: Record<Sentiment, string> = {
  positive: "bg-sentiment-positive",
  neutral: "bg-sentiment-neutral",
  negative: "bg-sentiment-negative",
};

const statusColorClass: Record<Status, string> = {
  New: "bg-status-new/10 text-status-new border-status-new/20",
  "AI Processed": "bg-status-ai-processed/10 text-status-ai-processed border-status-ai-processed/20",
  "Awaiting Review": "bg-status-awaiting/10 text-status-awaiting border-status-awaiting/20",
  Approved: "bg-status-approved/10 text-status-approved border-status-approved/20",
  Replied: "bg-status-replied/10 text-status-replied border-status-replied/20",
  Escalated: "bg-status-escalated/10 text-status-escalated border-status-escalated/20",
  "Awaiting Customer": "bg-status-awaiting/10 text-status-awaiting border-status-awaiting/20",
};

const intentColors: Record<Intent, string> = {
  "Order Creation": "bg-primary/10 text-primary",
  "Order Change": "bg-status-awaiting/10 text-status-awaiting",
  "Stock Enquiry": "bg-status-ai-processed/10 text-status-ai-processed",
  "Credit Enquiry": "bg-sentiment-positive/10 text-sentiment-positive",
  "General Question": "bg-muted text-muted-foreground",
};

interface EmailListProps {
  emails: Email[];
  selectedId: string | null;
  onSelect: (email: Email) => void;
  statuses: StatusDef[];
  onArchive?: (email: Email, archived: boolean) => void;
  onDelete?: (email: Email) => void;
  onBulkArchive?: (ids: string[], archived: boolean) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkMarkRead?: (ids: string[], read: boolean) => void;
  showArchiveBulk?: boolean;
  showDeleteBulk?: boolean;
  title?: string;
  onCollapse?: () => void;
}

export function EmailList({
  emails, selectedId, onSelect, statuses, onArchive, onDelete,
  onBulkArchive, onBulkDelete, onBulkMarkRead,
  showArchiveBulk = true, showDeleteBulk = false,
  title = "Inbox", onCollapse,
}: EmailListProps) {
  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [intentFilter, setIntentFilter] = useState<Intent | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => emails.filter((e) => {
    const matchSearch = !search || e.customer_name.toLowerCase().includes(search.toLowerCase()) || e.subject.toLowerCase().includes(search.toLowerCase());
    const matchSentiment = sentimentFilter === "all" || e.sentiment === sentimentFilter;
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    const matchIntent = intentFilter === "all" || e.intent === intentFilter;
    return matchSearch && matchSentiment && matchStatus && matchIntent;
  }), [emails, search, sentimentFilter, statusFilter, intentFilter]);

  const selectedArr = useMemo(
    () => filtered.filter((e) => selectedIds.has(e.id)),
    [filtered, selectedIds]
  );
  const allSelected = filtered.length > 0 && selectedArr.length === filtered.length;
  const someSelected = selectedArr.length > 0;

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map((e) => e.id));
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Determine bulk archive label based on majority state in selection
  const allSelectedArchived = selectedArr.length > 0 && selectedArr.every((e) => e.is_archived);

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">{title}</h2>
          <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{emails.length}</span>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Collapse email list"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-secondary rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Filter className="w-3 h-3" />
          Filters
          <ChevronDown className={cn("w-3 h-3 transition-transform", showFilters && "rotate-180")} />
        </button>
        {showFilters && (
          <div className="mt-2 space-y-2 animate-fade-in">
            <select value={sentimentFilter} onChange={(e) => setSentimentFilter(e.target.value as any)} className="w-full text-xs p-1.5 rounded-md bg-secondary border-0 outline-none">
              <option value="all">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
            <select value={intentFilter} onChange={(e) => setIntentFilter(e.target.value as any)} className="w-full text-xs p-1.5 rounded-md bg-secondary border-0 outline-none">
              <option value="all">All Intents</option>
              <option value="Order Creation">Order Creation</option>
              <option value="Order Change">Order Change</option>
              <option value="Stock Enquiry">Stock Enquiry</option>
              <option value="Credit Enquiry">Credit Enquiry</option>
              <option value="General Question">General Question</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-full text-xs p-1.5 rounded-md bg-secondary border-0 outline-none">
              <option value="all">All Statuses</option>
              {statuses.map((s) => (
                <option key={s.key} value={s.display_name}>{s.display_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            aria-label="Select all"
          />
          {someSelected ? (
            <>
              <span className="text-xs font-medium text-foreground">{selectedArr.length} selected</span>
              <div className="ml-auto flex items-center gap-1">
                {onBulkMarkRead && (
                  <button
                    onClick={() => { onBulkMarkRead(selectedArr.map((e) => e.id), true); clearSelection(); }}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Mark as read"
                  >
                    <MailOpen className="w-3.5 h-3.5" />
                  </button>
                )}
                {onBulkArchive && showArchiveBulk && (
                  <button
                    onClick={() => { onBulkArchive(selectedArr.map((e) => e.id), !allSelectedArchived); clearSelection(); }}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title={allSelectedArchived ? "Unarchive" : "Archive"}
                  >
                    {allSelectedArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  </button>
                )}
                {onBulkDelete && showDeleteBulk && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedArr.length} email{selectedArr.length === 1 ? "" : "s"}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the selected emails. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => { onBulkDelete(selectedArr.map((e) => e.id)); clearSelection(); }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <button
                  onClick={clearSelection}
                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Clear selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Select all</span>
          )}
        </div>
      )}

      {/* Email items */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((email) => {
          const checked = selectedIds.has(email.id);
          return (
            <div
              key={email.id}
              className={cn(
                "group relative border-b border-border hover:bg-accent/50 transition-colors",
                selectedId === email.id && "bg-primary/5 border-l-2 border-l-primary",
                checked && "bg-primary/5"
              )}
            >
              <div className="flex items-start">
                <div
                  className="pl-4 pt-5 pr-1"
                  onClick={(e) => { e.stopPropagation(); toggleOne(email.id); }}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleOne(email.id)}
                    aria-label="Select email"
                  />
                </div>
                <button
                  onClick={() => onSelect(email)}
                  className="flex-1 text-left p-4 pl-2 min-w-0"
                >
                  <div className="flex items-start gap-2">
                    <span className={cn("w-2.5 h-2.5 rounded-full mt-1.5 shrink-0", sentimentDotClass[email.sentiment])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-sm truncate", !email.is_read ? "font-semibold" : "font-medium text-foreground/70")}>
                          {!email.is_read && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5 align-middle" />}
                          {email.customer_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(email.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <p className={cn("text-sm truncate mt-0.5", !email.is_read ? "font-medium text-foreground" : "text-foreground/70")}>{email.subject}</p>
                        {email.attachments && email.attachments.length > 0 && (
                          <Paperclip className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{email.body.slice(0, 120)}...</p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", intentColors[email.intent] || "bg-primary/10 text-primary")}>{formatLabel(email.intent)}</span>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", statusColorClass[email.status] || "bg-muted text-muted-foreground border-border")}>{formatLabel(email.status)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onArchive && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onArchive(email, !email.is_archived); }}
                    className="p-1.5 rounded-md hover:bg-background/80"
                    title={email.is_archived ? "Unarchive" : "Archive"}
                  >
                    {email.is_archived ? <ArchiveRestore className="w-3.5 h-3.5 text-muted-foreground" /> : <Archive className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                )}
                {onDelete && email.is_archived && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-md hover:bg-destructive/10"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this email?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{email.subject}" from {email.customer_name}. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(email)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No emails match your filters</div>
        )}
      </div>
    </div>
  );
}
