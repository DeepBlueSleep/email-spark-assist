import { useState, useMemo, useEffect } from "react";
import { useEmails } from "@/hooks/useEmails";
import { useStatuses } from "@/hooks/useStatuses";
import { EmailList } from "@/components/EmailList";
import { EmailDetail } from "@/components/EmailDetail";
import { IrrelevantEmailView } from "@/components/IrrelevantEmailView";
import {
  Bot, Inbox, Wifi, WifiOff, Mail, MailOpen,
  Archive, Filter as FilterIcon, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Email } from "@/data/mockData";

type InboxTab = "unread" | "read" | "archived" | "other";

const Index = () => {
  const { emails, isLoading, usingLiveData, updateStatus, markRead, setArchived } = useEmails();
  const statuses = useStatuses();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<InboxTab>("unread");
  const [listCollapsed, setListCollapsed] = useState(false);

  const { unread, read, archived, other } = useMemo(() => {
    const unread: Email[] = [];
    const read: Email[] = [];
    const archived: Email[] = [];
    const other: Email[] = [];
    for (const e of emails) {
      if (e.is_relevant === false) {
        other.push(e);
      } else if (e.is_archived) {
        archived.push(e);
      } else if (e.is_read) {
        read.push(e);
      } else {
        unread.push(e);
      }
    }
    return { unread, read, archived, other };
  }, [emails]);

  const tabConfig: Record<InboxTab, { label: string; icon: typeof Inbox; emails: Email[]; emptyText: string }> = {
    unread:   { label: "Unread",   icon: Mail,        emails: unread,   emptyText: "No unread emails" },
    read:     { label: "Read",     icon: MailOpen,    emails: read,     emptyText: "No read emails" },
    archived: { label: "Archived", icon: Archive,     emails: archived, emptyText: "No archived emails" },
    other:    { label: "Other",    icon: FilterIcon,  emails: other,    emptyText: "No irrelevant emails" },
  };

  const visibleEmails = tabConfig[tab].emails;
  // Only honor explicit user selection — do NOT auto-fallback, otherwise auto-mark-read
  // cascades through the Unread list as marked items leave the visible set.
  const effectiveSelectedId =
    selectedId && emails.some((e) => e.id === selectedId) ? selectedId : null;
  const selectedEmail = emails.find((e) => e.id === effectiveSelectedId);

  // Auto mark-as-read only on explicit user click.
  const handleSelect = (email: Email) => {
    setSelectedId(email.id);
    if (!email.is_read && email.is_relevant !== false) {
      markRead(email.id, true);
    }
  };

  const handleArchive = (email: Email, archive: boolean) => {
    setArchived(email.id, archive);
    if (selectedId === email.id) setSelectedId(null);
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 bg-card border-b border-border flex items-center px-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-base font-semibold">AI Email Order Review</h1>
        </div>
        <span className="ml-4 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">MVP</span>
        <div className="ml-auto flex items-center gap-4">
          {usingLiveData ? (
            <span className="flex items-center gap-1 text-xs text-green-600"><Wifi className="w-3.5 h-3.5" />Live Data</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><WifiOff className="w-3.5 h-3.5" />Mock Data</span>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <nav className="w-16 shrink-0 bg-card border-r border-border flex flex-col items-center py-3 gap-2">
          {(Object.keys(tabConfig) as InboxTab[]).map((key) => {
            const cfg = tabConfig[key];
            const Icon = cfg.icon;
            const active = tab === key;
            const count = cfg.emails.length;
            return (
              <button
                key={key}
                onClick={() => { setTab(key); setSelectedId(null); }}
                className={cn(
                  "w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative",
                  active
                    ? key === "other"
                      ? "bg-muted-foreground/10 text-foreground"
                      : "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent"
                )}
                title={cfg.label}
              >
                <Icon className="w-4 h-4" />
                <span>{cfg.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "absolute top-1 right-1 text-[9px] rounded-full px-1 min-w-[14px] h-[14px] flex items-center justify-center font-semibold",
                      key === "other"
                        ? "bg-muted-foreground text-background"
                        : key === "unread"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted-foreground/40 text-foreground"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {!listCollapsed && (
          <div className="w-[380px] shrink-0">
            <EmailList
              emails={visibleEmails}
              selectedId={effectiveSelectedId}
              onSelect={(e) => setSelectedId(e.id)}
              statuses={statuses}
              onArchive={tab === "other" ? undefined : handleArchive}
              title={tabConfig[tab].label}
              onCollapse={() => setListCollapsed(true)}
            />
          </div>
        )}
        {listCollapsed && (
          <button
            onClick={() => setListCollapsed(false)}
            className="w-8 shrink-0 bg-card border-r border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Expand email list"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {selectedEmail ? (
          tab === "other" ? (
            <IrrelevantEmailView email={selectedEmail} />
          ) : (
            <EmailDetail email={selectedEmail} onStatusChange={updateStatus} />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{isLoading ? "Loading..." : tabConfig[tab].emptyText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
