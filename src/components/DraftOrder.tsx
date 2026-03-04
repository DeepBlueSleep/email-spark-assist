import { useState } from "react";
import { ExtractedOrderItem, RecommendedSKU } from "@/data/mockData";
import { Plus, Trash2, ClipboardList, Package, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraftOrderProps {
  orderItems: ExtractedOrderItem[];
  recommendedSkus: RecommendedSKU[];
  onOrderChange: (items: ExtractedOrderItem[]) => void;
}

export function DraftOrder({ orderItems, recommendedSkus, onOrderChange }: DraftOrderProps) {
  // Track SKUs that have been removed from the order and sit in the "available" panel
  const [removedSkus, setRemovedSkus] = useState<RecommendedSKU[]>([]);

  const updateItem = (id: string, field: keyof ExtractedOrderItem, value: string | number) => {
    onOrderChange(orderItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id: string) => {
    const item = orderItems.find((i) => i.id === id);
    if (item) {
      // Check if this item originated from a recommended SKU
      const matchingSku = recommendedSkus.find(
        (s) => s.sku_code === item.item_code || s.name === item.item_name
      );
      if (matchingSku && !removedSkus.some((r) => r.sku_code === matchingSku.sku_code)) {
        setRemovedSkus((prev) => [...prev, matchingSku]);
      }
    }
    onOrderChange(orderItems.filter((i) => i.id !== id));
  };

  const addBlankItem = () => {
    const newItem: ExtractedOrderItem = {
      id: `oi-new-${Date.now()}`,
      item_code: "",
      item_name: "",
      quantity: 1,
      unit: "units",
      delivery_date: "",
      delivery_address: "",
      remarks: "",
    };
    onOrderChange([...orderItems, newItem]);
  };

  const addSkuToOrder = (sku: RecommendedSKU) => {
    const newItem: ExtractedOrderItem = {
      id: `oi-sku-${Date.now()}-${sku.sku_code}`,
      item_code: sku.sku_code,
      item_name: sku.name,
      quantity: 1,
      unit: "units",
      delivery_date: "",
      delivery_address: "",
      remarks: sku.match_reason,
    };
    onOrderChange([...orderItems, newItem]);
    setRemovedSkus((prev) => prev.filter((r) => r.sku_code !== sku.sku_code));
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Draft Order</h3>
          <span className="text-xs text-muted-foreground">
            {orderItems.length} item{orderItems.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={addBlankItem}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add Item
        </button>
      </div>

      {/* Order Table */}
      {orderItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No items in draft order</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left py-2 px-2 font-medium">Item Code</th>
                <th className="text-left py-2 px-2 font-medium">Item Name</th>
                <th className="text-left py-2 px-2 font-medium">Qty</th>
                <th className="text-left py-2 px-2 font-medium">Unit</th>
                <th className="text-left py-2 px-2 font-medium">Delivery Date</th>
                <th className="text-left py-2 px-2 font-medium">Address</th>
                <th className="text-left py-2 px-2 font-medium">Remarks</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item) => {
                const isFromSku = recommendedSkus.some(
                  (s) => s.sku_code === item.item_code || s.name === item.item_name
                );
                return (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-accent/30">
                    <td className="py-2 px-2">
                      <input
                        value={item.item_code}
                        onChange={(e) => updateItem(item.id, "item_code", e.target.value)}
                        className="w-24 text-xs font-mono px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          value={item.item_name}
                          onChange={(e) => updateItem(item.id, "item_name", e.target.value)}
                          className="w-full min-w-[140px] text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        {isFromSku && (
                          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            AI Match
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                        className="w-16 text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                        className="w-16 text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="date"
                        value={item.delivery_date}
                        onChange={(e) => updateItem(item.id, "delivery_date", e.target.value)}
                        className="text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        value={item.delivery_address}
                        onChange={(e) => updateItem(item.id, "delivery_address", e.target.value)}
                        className="w-full min-w-[120px] text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        value={item.remarks}
                        onChange={(e) => updateItem(item.id, "remarks", e.target.value)}
                        className="w-full min-w-[100px] text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Removed / Available Products Panel */}
      {removedSkus.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Removed Products — click to add back
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {removedSkus.map((sku) => (
              <button
                key={sku.sku_code}
                onClick={() => addSkuToOrder(sku)}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-accent/50 transition-colors group"
              >
                <Undo2 className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="text-left">
                  <span className="font-medium">{sku.name}</span>
                  <span className="text-muted-foreground ml-1.5">{sku.sku_code}</span>
                </div>
                {sku.price > 0 && (
                  <span className="text-muted-foreground">${sku.price.toFixed(2)}</span>
                )}
                <span
                  className={cn(
                    "text-[10px]",
                    sku.stock_level > 10 ? "text-sentiment-positive" : "text-sentiment-negative"
                  )}
                >
                  {sku.stock_level} in stock
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
