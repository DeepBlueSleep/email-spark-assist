import { useState } from "react";
import { RecommendedSKU, ExtractedOrderItem } from "@/data/mockData";
import { Package, Plus, ArrowRightLeft, X, Check, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface SKURecommendationsProps {
  skus: RecommendedSKU[];
  orderItems: ExtractedOrderItem[];
  onAddToOrder: (skuCode: string, skuName: string) => void;
  onReplace: (oldItemId: string, skuCode: string, skuName: string) => void;
}

export function SKURecommendations({ skus, orderItems, onAddToOrder, onReplace }: SKURecommendationsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [replacingFor, setReplacingFor] = useState<{ skuCode: string; skuName: string } | null>(null);

  const visibleSkus = skus.filter((s) => !dismissed.has(s.sku_code));

  const handleAdd = (sku: RecommendedSKU) => {
    onAddToOrder(sku.sku_code, sku.name);
    setAdded((prev) => new Set(prev).add(sku.sku_code));
  };

  const handleStartReplace = (sku: RecommendedSKU) => {
    setReplacingFor({ skuCode: sku.sku_code, skuName: sku.name });
  };

  const handleReplace = (itemId: string) => {
    if (replacingFor) {
      onReplace(itemId, replacingFor.skuCode, replacingFor.skuName);
      setAdded((prev) => new Set(prev).add(replacingFor.skuCode));
      setReplacingFor(null);
    }
  };

  if (visibleSkus.length === 0) return null;

  return (
    <div className="bg-card rounded-xl shadow-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Relevant Products Based on Email Context</h3>
      </div>

      {replacingFor && (
        <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20 text-sm">
          <p className="font-medium text-primary mb-2">Select item to replace with {replacingFor.skuName}:</p>
          <div className="space-y-1">
            {orderItems.map((item) => (
              <button key={item.id} onClick={() => handleReplace(item.id)} className="w-full text-left px-3 py-2 rounded hover:bg-primary/10 text-sm transition-colors">
                {item.item_code} — {item.item_name}
              </button>
            ))}
          </div>
          <button onClick={() => setReplacingFor(null)} className="mt-2 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {visibleSkus.map((sku) => (
          <div key={sku.sku_code} className="border border-border rounded-lg p-4 hover:shadow-card-hover transition-shadow relative group">
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(sku.sku_code))}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-muted-foreground">{sku.sku_code}</p>
                <p className="text-sm font-medium truncate">{sku.name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sku.color !== "N/A" && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{sku.color}</span>}
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{sku.category}</span>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{sku.size}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <div>
                {sku.price > 0 && <span className="text-sm font-semibold">{sku.price > 0 && <span className="text-sm font-semibold">${sku.price.toFixed(2)}</span>}</span>}
                <span className={cn("text-xs ml-2", sku.stock_level > 10 ? "text-sentiment-positive" : "text-sentiment-negative")}>
                  {sku.stock_level} in stock
                </span>
              </div>
            </div>

            <p className="text-[10px] text-primary/70 mt-2 italic">{sku.match_reason}</p>

            {added.has(sku.sku_code) ? (
              <div className="mt-3 flex items-center gap-1 text-xs text-sentiment-positive"><Check className="w-3 h-3" /> Added</div>
            ) : (
              <div className="mt-3 flex gap-2">
                <button onClick={() => handleAdd(sku)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Plus className="w-3 h-3" /> Add to Order
                </button>
                {orderItems.length > 0 && (
                  <button onClick={() => handleStartReplace(sku)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-accent transition-colors">
                    <ArrowRightLeft className="w-3 h-3" /> Replace
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
