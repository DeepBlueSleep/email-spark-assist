import { useState, useEffect, useRef } from "react";
import { RecommendedSKU, ExtractedOrderItem } from "@/data/mockData";
import { Plus, Trash2, ClipboardList, Package, Undo2, Search, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { invokeFunction } from "@/lib/api";

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
  requested_quantity: number;
  stock_insufficient: boolean;
}

interface ProductResult {
  id: string;
  sku_code: string;
  name: string;
  category: string;
  color: string | null;
  size: string | null;
  price: number | null;
  stock_level: number | null;
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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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
    setShowSearch(false);
    setSearchQuery("");
  }

  // Search products via API
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await invokeFunction("api-products", { params: { search: searchQuery } });
        setSearchResults((data.products || []).slice(0, 8));
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addProductFromSearch = (product: ProductResult) => {
    const existing = items.find((i) => i.sku_code === product.sku_code);
    if (existing) return;
    const newItem: DraftOrderItem = {
      id: `do-${product.sku_code}-${Date.now()}`,
      sku_code: product.sku_code,
      name: product.name,
      category: product.category,
      color: product.color || "",
      size: product.size || "",
      price: product.price || 0,
      stock_level: product.stock_level || 0,
      match_reason: "Manually added",
      quantity: 1,
    };
    setItems((prev) => [...prev, newItem]);
    setShowSearch(false);
    setSearchQuery("");
  };

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

  const updateItem = (id: string, field: keyof DraftOrderItem, value: string | number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Draft Order</h3>
          <span className="text-xs text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="relative" ref={searchRef}>
          {showSearch ? (
            <div className="flex items-center gap-1">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products…"
                  className="text-xs pl-7 pr-2 py-1.5 w-56 rounded-md bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
              {searchQuery.trim() && (
                <div className="absolute top-full right-0 mt-1 w-72 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {searching ? (
                    <p className="text-xs text-muted-foreground p-3 text-center">Searching…</p>
                  ) : searchResults.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 text-center">No products found</p>
                  ) : (
                    searchResults.map((p) => {
                      const alreadyAdded = items.some((i) => i.sku_code === p.sku_code);
                      return (
                        <button
                          key={p.id}
                          disabled={alreadyAdded}
                          onClick={() => addProductFromSearch(p)}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs hover:bg-accent/50 transition-colors flex items-center justify-between gap-2 border-b border-border/30 last:border-0",
                            alreadyAdded && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          <div>
                            <span className="font-medium">{p.name}</span>
                            <span className="text-muted-foreground ml-2 font-mono">{p.sku_code}</span>
                          </div>
                          {alreadyAdded ? (
                            <span className="text-[10px] text-muted-foreground">Added</span>
                          ) : (
                            <Plus className="w-3 h-3 text-primary" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Product
            </button>
          )}
        </div>
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
                  <td className="py-2 px-2">
                    <input value={item.sku_code} onChange={(e) => updateItem(item.id, "sku_code", e.target.value)} className="w-24 text-xs font-mono px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30" />
                  </td>
                  <td className="py-2 px-2">
                    <input value={item.name} onChange={(e) => updateItem(item.id, "name", e.target.value)} className="w-full min-w-[120px] text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30" />
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex flex-wrap gap-1">
                      <input value={item.color} onChange={(e) => updateItem(item.id, "color", e.target.value)} placeholder="Color" className="w-16 text-[10px] px-1.5 py-0.5 rounded bg-muted border-0 outline-none focus:ring-1 focus:ring-primary/30" />
                      <input value={item.size} onChange={(e) => updateItem(item.id, "size", e.target.value)} placeholder="Size" className="w-20 text-[10px] px-1.5 py-0.5 rounded bg-muted border-0 outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <input type="number" value={item.price} onChange={(e) => updateItem(item.id, "price", parseFloat(e.target.value) || 0)} className="w-16 text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30" />
                  </td>
                  <td className="py-2 px-2">
                    <span className={cn("text-xs", item.stock_level > 10 ? "text-sentiment-positive" : "text-sentiment-negative")}>
                      {item.stock_level}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)} className="w-14 text-xs px-2 py-1 rounded bg-secondary border-0 outline-none focus:ring-1 focus:ring-primary/30" />
                  </td>
                  <td className="py-2 px-2 text-[10px] text-primary/70 italic max-w-[180px]">{item.match_reason}</td>
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
