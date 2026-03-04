import { Email } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Brain, AlertTriangle, Clock } from "lucide-react";

const sentimentBadge = {
  positive: "bg-sentiment-positive/10 text-sentiment-positive",
  neutral: "bg-sentiment-neutral/10 text-sentiment-neutral",
  negative: "bg-sentiment-negative/10 text-sentiment-negative",
};

export function AIAnalysisPanel({ email }: { email: Email }) {
  const hasAnalysis = email.sentiment_confidence > 0 || email.intent_confidence > 0;

  if (!hasAnalysis) {
    return (
      <div className="bg-card rounded-xl shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Analysis</h3>
        </div>
        <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
          <Clock className="w-4 h-4 shrink-0" />
          <span>Awaiting AI enrichment — analysis will appear once the email has been processed.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">AI Analysis</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Sentiment */}
        <div className="bg-secondary/50 rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Sentiment</p>
          {email.sentiment_confidence > 0 ? (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-semibold px-2.5 py-1 rounded-md capitalize",
                  sentimentBadge[email.sentiment],
                )}
              >
                {email.sentiment}
              </span>
              <span className="text-xs text-muted-foreground">
                {(Number(email.sentiment_confidence) * 100).toFixed(2)}% confidence
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">Not analyzed</span>
          )}
        </div>

        {/* Intent */}
        <div className="bg-secondary/50 rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Intent Classification</p>
          {email.intent_confidence > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                  {email.intent}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(Number(email.intent_confidence) * 100).toFixed(2)}% confidence
                </span>
              </div>
              {email.intent_confidence * 100 < 70 && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-sentiment-neutral bg-sentiment-neutral/10 px-2 py-1 rounded">
                  <AlertTriangle className="w-3 h-3" />
                  Low confidence — review carefully
                </div>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic">Not classified</span>
          )}
        </div>
      </div>
    </div>
  );
}
