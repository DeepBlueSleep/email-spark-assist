import { useState } from "react";
import { MessageSquare, RefreshCw, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

interface AIReplyEditorProps {
  draft: string;
  onChange: (text: string) => void;
}

export function AIReplyEditor({ draft, onChange }: AIReplyEditorProps) {
  const [tone, setTone] = useState("Professional");
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="bg-card rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Suggested Reply</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-md bg-secondary border-0 outline-none"
          >
            <option>Professional</option>
            <option>Friendly</option>
            <option>Direct</option>
          </select>
          <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent transition-colors">
            <RefreshCw className="w-3 h-3" /> Regenerate
          </button>
        </div>
      </div>

      <textarea
        value={draft}
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
