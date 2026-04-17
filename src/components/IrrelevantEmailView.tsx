import { Email } from "@/data/mockData";
import { Badge } from "./ui/badge";
import { User, Clock, Filter as FilterIcon } from "lucide-react";

interface IrrelevantEmailViewProps {
  email: Email;
}

export function IrrelevantEmailView({ email }: IrrelevantEmailViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
      <div className="bg-card rounded-xl shadow-card p-6 max-w-3xl">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{email.subject}</h2>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-border">
                <FilterIcon className="w-3 h-3 mr-1" />
                Irrelevant
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{email.customer_name}</span>
              <span className="text-xs">{email.email}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(email.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {email.relevance_reason && (
          <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Why it was filtered out</p>
            <p className="text-sm text-foreground/80">{email.relevance_reason}</p>
          </div>
        )}

        <div className="bg-secondary/50 rounded-lg p-4">
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">{email.body}</pre>
        </div>
      </div>
    </div>
  );
}
