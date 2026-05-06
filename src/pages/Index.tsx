import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useEmails } from "@/hooks/useEmails";
import { useStatuses } from "@/hooks/useStatuses";
import { EmailList } from "@/components/EmailList";
import { EmailDetail } from "@/components/EmailDetail";
import { IrrelevantEmailView } from "@/components/IrrelevantEmailView";
import {
  Bot, Inbox, Wifi, WifiOff, MessageSquare,
  Filter as FilterIcon, ChevronRight, LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Email } from "@/data/mockData";

type InboxTab = "relevant" | "irrelevant";

const Index = () => {
  const { emails, isLoading, usingLiveData, updateStatus, setRelevant, bulkSetRelevant, bulkSetStatus } = useEmails();
  const statuses = useStatuses();
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<InboxTab>(((): InboxTab => {
    const t = searchParams.get("tab");
    if (t === "irrelevant" || t === "other") return "irrelevant";
    return "relevant";
  })());
  const [listCollapsed, setListCollapsed] = useState(false);

  // Honor ?message=<id> (or legacy ?email=<id>) from dashboard drill-down
  useEffect(() => {
    const id = searchParams.get("message") || searchParams.get("email");
    if (id && emails.some((e) => e.id === id)) {
      setSelectedId(id);
      const target = emails.find((e) => e.id === id);
      if (target) {
        setTab(target.is_relevant === false ? "irrelevant" : "relevant");
      }
    }
  }, [searchParams, emails]);

  const { relevant, irrelevant } = useMemo(() => {
    const relevant: Email[] = [];
    const irrelevant: Email[] = [];
    for (const e of emails) {
      if (e.is_relevant === false) {
        irrelevant.push(e);
      } else {
        relevant.push(e);
      }
    }
    return { relevant, irrelevant };
  }, [emails]);

  const tabConfig: Record<InboxTab, { label: string; icon: typeof Inbox; emails: Email[]; emptyText: string; badge: number }> = {
    relevant:   { label: "Relevant",   icon: MessageSquare, emails: relevant,   emptyText: "No messages", badge: 0 },
    irrelevant: { label: "Irrelevant", icon: FilterIcon,    emails: irrelevant, emptyText: "No irrelevant messages", badge: 0 },
  };

  const visibleEmails = tabConfig[tab].emails;
  const effectiveSelectedId =
    selectedId && emails.some((e) => e.id === selectedId) ? selectedId : null;
  const selectedEmail = emails.find((e) => e.id === effectiveSelectedId);

  const handleSelect = (email: Email) => {
    setSelectedId(email.id);
  };

  const handleToggleRelevant = (email: Email, isRelevant: boolean) => {
    setRelevant(email.id, isRelevant);
    if (selectedId === email.id) setSelectedId(null);
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 bg-card border-b border-border flex items-center px-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-base font-semibold">AI Message Order Review</h1>
        </div>
        <nav className="ml-6 flex items-center gap-1">
          <Link to="/" className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <Link to="/inbox" className="px-3 py-1.5 rounded-md text-sm font-medium bg-muted text-foreground">
            Messages
          </Link>
          <Link to="/audit-logs" className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            Audit Logs
          </Link>
        </nav>
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
            const count = cfg.badge;
            return (
              <button
                key={key}
                onClick={() => { setTab(key); setSelectedId(null); }}
                className={cn(
                  "w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative",
                  active
                    ? key === "irrelevant"
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
                      key === "irrelevant"
                        ? "bg-muted-foreground text-background"
                        : "bg-primary text-primary-foreground"
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
              onSelect={handleSelect}
              statuses={statuses}
              onToggleRelevant={handleToggleRelevant}
              onBulkSetRelevant={bulkSetRelevant}
              onBulkMarkRead={tab === "relevant" ? bulkMarkRead : undefined}
              onBulkApprove={tab === "relevant" ? (ids) => bulkSetStatus(ids, "Replied") : undefined}
              
              showWorkflowBulk={tab === "relevant"}
              currentTab={tab}
              title={tabConfig[tab].label}
              onCollapse={() => setListCollapsed(true)}
            />
          </div>
        )}
        {listCollapsed && (
          <button
            onClick={() => setListCollapsed(false)}
            className="w-8 shrink-0 bg-card border-r border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Expand message list"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {selectedEmail ? (
          tab === "irrelevant" ? (
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
