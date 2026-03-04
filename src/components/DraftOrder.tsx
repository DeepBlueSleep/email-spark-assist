import { useState } from "react";
import { RecommendedSKU } from "@/data/mockData";
import { Plus, Trash2, ClipboardList, Package, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraftOrderItem {
  id: string;
  sku_code: string;
  name: string;
  category: string;
  color: string;
  size: string;
  price: number;
  stock_level: number;
  match_reason: string;
  quantity: number;
}

interface DraftOrderProps {
  recommendedSkus: RecommendedSKU[];
}

export function DraftOrder({ recommendedSkus }: DraftOrderProps) {
  const [items, setItems] = useState<DraftOrderItem[]>(() =>
    recommendedSkus.map((sku) => ({
      id: `do-${sku.sku_code}`,
      sku_code: sku.sku_code,
      name: sku.name,
      category: sku.category,
      color: sku.color,
      size: sku.size,
      price: sku.price,
      stock_level: sku.stock_level,
      match_reason: sku.match_reason,
      quantity: 1,
    }))
  );
  const [removed, setRemoved] = useState<DraftOrderItem[]>([]);

  // Reset when SKUs change (email switch)
  const [prevSkus, setPrevSkus] = useState(recommendedSkus);
  if (recommendedSkus !== prevSkus) {
    setPrevSkus(recommendedSkus);
    setItems(
      recommendedSkus.map((sku) => ({
        id: `do-${sku.sku_code}`,
        sku_code: sku.sku_code,
        name: sku.name,
        category: sku.category,
        color: sku.color,
        size: sku.size,
        price: sku.price,
        stock_level: sku.stock_level,
        match_reason: sku.match_reason,
        quantity: 1,
      }))
    );
    setRemoved([]);
  }

  const removeItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) setRemoved((prev) => [...prev, item]);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const addBack = (id: string) => {
    const item = removed.find((i) => i.id === id);
    if (item) {
      setItems((prev) => [...prev, item]);
      setRemoved((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const updateQty = (id: string, qty: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Draft Order</h3>
        <span className="text-xs text-muted-foreground">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No items in draft order</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left py-2 px-2 font-medium">SKU</th>
                <th className="text-left py-2 px-2 font-medium">Product</th>
                <th className="text-left py-2 px-2 font-medium">Details</th>
                <th className="text-left py-2 px-2 font-medium">Price</th>
                <th className="text-left py-2 px-2 font-medium">Stock</th>
                <th className="text-left py-2 px-2 font-medium">Qty</th>
                <th className="text-left py-2 px-2 font-medium">Match Reason</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{item.sku_code}</td>
                  <td className="py-2 px-2 text-xs font-medium">{item.name}</td>
                  <td className="py-2 px-2">
                    <div className="flex flex-wrap gap-1">
                      {item.color && item.color !== "N/A" && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{item.color}</span>
                      )}
                      {item.category && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{item.category}</span>
                      )}
                      {item.size && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{item.size}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {item.price > 0 ? `$${item.price.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-2 px-2">
                    <span className={cn("text-xs", item.stock_level > 10 ? "text-sentiment-positive" : "text-sentiment-negative")}>
                      {item.stock_level}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)}
                      className="w-14 text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </td>
                  <td className="py-2 px-2 text-[10px] text-primary/70 italic max-w-[180px]">{item.match_reason}</td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Removed products panel */}
      {removed.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Removed Products — click to add back
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {removed.map((item) => (
              <button
                key={item.id}
                onClick={() => addBack(item.id)}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-accent/50 transition-colors group"
              >
                <Undo2 className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground">{item.sku_code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
