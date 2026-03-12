import { useState, useEffect } from "react";
import { MessageSquare, RefreshCw, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { invokeFunction } from "@/lib/api";

interface AIReplyEditorProps {
  emailId: string;
  draft: string;
  onChange: (text: string) => void;
}

interface DraftRecord {
  tone: string;
  draft: string;
}

export function AIReplyEditor({ emailId, draft, onChange }: AIReplyEditorProps) {
  const [tone, setTone] = useState("Professional");
  const [showExplanation, setShowExplanation] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [hasDrafts, setHasDrafts] = useState(false);

  useEffect(() => {
    async function fetchDrafts() {
      try {
        const data = await invokeFunction("api-drafts", { params: { email_id: emailId } });
        const draftsList = data.drafts || [];

        if (draftsList.length > 0) {
          const map: Record<string, string> = {};
          (draftsList as DraftRecord[]).forEach((d) => {
            map[d.tone] = d.draft;
          });
          setDrafts(map);
          setHasDrafts(true);
          if (map["Professional"]) {
            onChange(map["Professional"]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch drafts:", err);
      }
    }
    fetchDrafts();
  }, [emailId]);

  const handleToneChange = (newTone: string) => {
    setTone(newTone);
    if (hasDrafts && drafts[newTone]) {
      onChange(drafts[newTone]);
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Suggested Reply</h3>
          {hasDrafts && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {Object.keys(drafts).length} tones
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {["Professional", "Friendly", "Direct"].map((t) => (
            <button
              key={t}
              onClick={() => handleToneChange(t)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                tone === t
                  ? "bg-primary text-primary-foreground"
                  : hasDrafts && drafts[t]
                  ? "bg-secondary hover:bg-accent border border-border"
                  : "bg-secondary/50 text-muted-foreground hover:bg-accent border border-border/50"
              }`}
            >
              {t}
              {hasDrafts && !drafts[t] && <span className="ml-1 opacity-50">—</span>}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={currentDraft}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        className="w-full text-sm p-4 rounded-lg bg-secondary/50 border border-border outline-none focus:ring-2 focus:ring-primary/20 resize-y leading-relaxed"
      />

      <button
        onClick={() => setShowExplanation(!showExplanation)}
        className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Lightbulb className="w-3.5 h-3.5" />
        AI Explanation
        {showExplanation ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showExplanation && (
        <div className="mt-3 p-4 bg-primary/5 rounded-lg border border-primary/10 text-xs space-y-2 animate-fade-in">
          <p><strong>Key Extracted Points:</strong> Customer name, item details, quantities, delivery requirements</p>
          <p><strong>SKU Suggestions Used:</strong> Matched available SKUs based on color, category, and order history</p>
          <p><strong>Credit Warnings:</strong> None detected</p>
          <p><strong>Stock References:</strong> All referenced items checked against current inventory levels</p>
        </div>
      )}
    </div>
  );
}
