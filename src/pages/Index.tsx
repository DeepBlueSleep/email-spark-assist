import { useState } from "react";
import { useEmails } from "@/hooks/useEmails";
import { useStatuses } from "@/hooks/useStatuses";
import { EmailList } from "@/components/EmailList";
import { EmailDetail } from "@/components/EmailDetail";
import { Bot, Inbox, Wifi, WifiOff, Package } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const { emails, isLoading, usingLiveData, updateStatus } = useEmails();
  const statuses = useStatuses();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const effectiveSelectedId = selectedId || emails[0]?.id || null;
  const selectedEmail = emails.find((e) => e.id === effectiveSelectedId);

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <header className="h-14 bg-card border-b border-border flex items-center px-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-base font-semibold">AI Email Order Review</h1>
        </div>
        <span className="ml-4 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">MVP</span>
        <div className="ml-auto flex items-center gap-4">
          <Link to="/products" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Package className="w-3.5 h-3.5" /> Products
          </Link>
          {usingLiveData ? (
            <span className="flex items-center gap-1 text-xs text-green-600"><Wifi className="w-3.5 h-3.5" />Live Data</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><WifiOff className="w-3.5 h-3.5" />Mock Data</span>
          )}
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        <div className="w-[380px] shrink-0">
          <EmailList emails={emails} selectedId={effectiveSelectedId} onSelect={(e) => setSelectedId(e.id)} statuses={statuses} />
        </div>
        {selectedEmail ? (
          <EmailDetail email={selectedEmail} onStatusChange={updateStatus} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{isLoading ? "Loading..." : "Select an email to review"}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
