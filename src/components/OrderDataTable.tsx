import { ExtractedOrderItem } from "@/data/mockData";
import { ClipboardList } from "lucide-react";

interface OrderDataTableProps {
  items: ExtractedOrderItem[];
}

export function OrderDataTable({ items }: OrderDataTableProps) {
  return (
    <div className="bg-card rounded-xl shadow-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Extracted Order Data</h3>
        <span className="text-xs text-muted-foreground ml-1">(read-only)</span>
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
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{item.item_code}</td>
                  <td className="py-2 px-2 text-xs">{item.item_name}</td>
                  <td className="py-2 px-2 text-xs">{item.quantity}</td>
                  <td className="py-2 px-2 text-xs">{item.unit}</td>
                  <td className="py-2 px-2 text-xs">{item.delivery_date || "—"}</td>
                  <td className="py-2 px-2 text-xs">{item.delivery_address || "—"}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground">{item.remarks || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
