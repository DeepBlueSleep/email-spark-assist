import { useState } from "react";
import { mockEmails, Email, Status } from "@/data/mockData";
import { EmailList } from "@/components/EmailList";
import { EmailDetail } from "@/components/EmailDetail";
import { Bot, Inbox } from "lucide-react";

const Index = () => {
  const [emails, setEmails] = useState<Email[]>(mockEmails);
  const [selectedId, setSelectedId] = useState<string | null>(mockEmails[0]?.id || null);

  const selectedEmail = emails.find((e) => e.id === selectedId);

  const handleStatusChange = (id: string, status: Status) => {
    setEmails(emails.map((e) => (e.id === id ? { ...e, status } : e)));
  };

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
      </header>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-[380px] shrink-0">
          <EmailList emails={emails} selectedId={selectedId} onSelect={(e) => setSelectedId(e.id)} />
        </div>

        {/* Main panel */}
        {selectedEmail ? (
          <EmailDetail email={selectedEmail} onStatusChange={handleStatusChange} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select an email to review</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
