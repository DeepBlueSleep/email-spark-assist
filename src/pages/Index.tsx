import { useState, useMemo } from "react";
import { useEmails } from "@/hooks/useEmails";
import { useStatuses } from "@/hooks/useStatuses";
import { EmailList } from "@/components/EmailList";
import { EmailDetail } from "@/components/EmailDetail";
import { IrrelevantEmailView } from "@/components/IrrelevantEmailView";
import { Bot, Inbox, Wifi, WifiOff, Inbox as InboxIcon, Filter as FilterIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type InboxTab = "relevant" | "irrelevant";

const Index = () => {
  const { emails, isLoading, usingLiveData, updateStatus } = useEmails();
  const statuses = useStatuses();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<InboxTab>("relevant");

  const { relevantEmails, irrelevantEmails } = useMemo(() => {
    const relevant: typeof emails = [];
    const irrelevant: typeof emails = [];
    for (const e of emails) {
      if (e.is_relevant === false) irrelevant.push(e);
      else relevant.push(e);
    }
    return { relevantEmails: relevant, irrelevantEmails: irrelevant };
  }, [emails]);

  const visibleEmails = tab === "relevant" ? relevantEmails : irrelevantEmails;
  const effectiveSelectedId =
    (selectedId && visibleEmails.some((e) => e.id === selectedId) ? selectedId : null) ||
    visibleEmails[0]?.id ||
    null;
  const selectedEmail = visibleEmails.find((e) => e.id === effectiveSelectedId);

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
          <button
            onClick={() => { setTab("relevant"); setSelectedId(null); }}
            className={cn(
              "w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative",
              tab === "relevant" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
            )}
            title="Inbox"
          >
            <InboxIcon className="w-4 h-4" />
            <span>Inbox</span>
            {relevantEmails.length > 0 && (
              <span className="absolute top-1 right-1 text-[9px] bg-primary text-primary-foreground rounded-full px-1 min-w-[14px] h-[14px] flex items-center justify-center">
                {relevantEmails.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab("irrelevant"); setSelectedId(null); }}
            className={cn(
              "w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative",
              tab === "irrelevant" ? "bg-muted-foreground/10 text-foreground" : "text-muted-foreground hover:bg-accent"
            )}
            title="Irrelevant"
          >
            <FilterIcon className="w-4 h-4" />
            <span>Other</span>
            {irrelevantEmails.length > 0 && (
              <span className="absolute top-1 right-1 text-[9px] bg-muted-foreground text-background rounded-full px-1 min-w-[14px] h-[14px] flex items-center justify-center">
                {irrelevantEmails.length}
              </span>
            )}
          </button>
        </nav>

        <div className="w-[380px] shrink-0">
          <EmailList emails={visibleEmails} selectedId={effectiveSelectedId} onSelect={(e) => setSelectedId(e.id)} statuses={statuses} />
        </div>
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
              <p className="text-sm">{isLoading ? "Loading..." : tab === "irrelevant" ? "No irrelevant emails" : "Select an email to review"}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
