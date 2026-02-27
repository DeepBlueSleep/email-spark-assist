import { ExtractedOrderItem } from "@/data/mockData";
import { Plus, Trash2, ClipboardList, AlertCircle } from "lucide-react";

interface OrderDataTableProps {
  items: ExtractedOrderItem[];
  onChange: (items: ExtractedOrderItem[]) => void;
}

export function OrderDataTable({ items, onChange }: OrderDataTableProps) {
  const updateItem = (id: string, field: keyof ExtractedOrderItem, value: string | number) => {
    onChange(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id: string) => onChange(items.filter((i) => i.id !== id));

  const addItem = () => {
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
    onChange([...items, newItem]);
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Extracted Order Data</h3>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-xs text-sentiment-neutral hover:text-foreground transition-colors">
            <AlertCircle className="w-3 h-3" /> Mark as Incorrect
          </button>
          <button onClick={addItem} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No order items extracted</p>
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
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="py-2 px-2">
                    <input value={item.item_code} onChange={(e) => updateItem(item.id, "item_code", e.target.value)} className="w-24 text-xs font-mono px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30" />
                  </td>
                  <td className="py-2 px-2">
                    <input value={item.item_name} onChange={(e) => updateItem(item.id, "item_name", e.target.value)} className="w-full min-w-[140px] text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30" />
                  </td>
                  <td className="py-2 px-2">
                    <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)} className="w-16 text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30" />
                  </td>
                  <td className="py-2 px-2">
                    <input value={item.unit} onChange={(e) => updateItem(item.id, "unit", e.target.value)} className="w-16 text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30" />
                  </td>
                  <td className="py-2 px-2">
                    <input type="date" value={item.delivery_date} onChange={(e) => updateItem(item.id, "delivery_date", e.target.value)} className="text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30" />
                  </td>
                  <td className="py-2 px-2">
                    <input value={item.delivery_address} onChange={(e) => updateItem(item.id, "delivery_address", e.target.value)} className="w-full min-w-[120px] text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30" />
                  </td>
                  <td className="py-2 px-2">
                    <input value={item.remarks} onChange={(e) => updateItem(item.id, "remarks", e.target.value)} className="w-full min-w-[100px] text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30" />
                  </td>
                  <td className="py-2 px-2">
                    <button onClick={() => removeItem(item.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
