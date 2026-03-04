import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Plus, Search, Package, Edit2, Trash2, X, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Product {
  id: string;
  sku_code: string;
  name: string;
  category: string;
  subcategory: string;
  tags: string[];
  color: string;
  size: string;
  material: string;
  price: number;
  stock_level: number;
  description: string;
  image_url: string;
  is_active: boolean;
}

const emptyProduct: Omit<Product, "id"> = {
  sku_code: "",
  name: "",
  category: "",
  subcategory: "",
  tags: [],
  color: "",
  size: "",
  material: "",
  price: 0,
  stock_level: 0,
  description: "",
  image_url: "",
  is_active: true,
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [tagsInput, setTagsInput] = useState("");

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setProducts(data as Product[]);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    const channel = supabase
      .channel("products-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchProducts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchProducts]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku_code.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm(emptyProduct);
    setTagsInput("");
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ ...p });
    setTagsInput(p.tags?.join(", ") || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.sku_code || !form.name) {
      toast.error("SKU code and name are required");
      return;
    }
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = { ...form, tags };

    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Product updated");
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select().single();
      if (error) { toast.error(error.message); return; }
      toast.success("Product added");
      // Notify external webhook about the new product
      supabase.functions.invoke("notify-product-added", { body: data }).catch((err) =>
        console.error("Failed to notify product webhook:", err)
      );
    }
    setShowForm(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted");
    fetchProducts();
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 bg-card border-b border-border flex items-center px-6 shrink-0">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mr-4">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-base font-semibold">Product Knowledge Base</h1>
        </div>
        <span className="ml-3 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{products.length} products</span>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Color</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Material</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{p.sku_code}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}{p.subcategory ? ` / ${p.subcategory}` : ""}</td>
                  <td className="px-4 py-3">{p.color}</td>
                  <td className="px-4 py-3">{p.size}</td>
                  <td className="px-4 py-3">{p.material}</td>
                  <td className="px-4 py-3 text-right">{p.price > 0 ? `$${p.price.toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-3 text-right">{p.stock_level}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? "bg-sentiment-positive/10 text-sentiment-positive" : "bg-muted text-muted-foreground"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-accent transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-xl shadow-elevated p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">{editing ? "Edit Product" : "Add Product"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">SKU Code *</label>
                <input value={form.sku_code} onChange={(e) => setForm({ ...form, sku_code: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Subcategory</label>
                <input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
                <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Size</label>
                <input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Material</label>
                <input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Price ($)</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Stock Level</label>
                <input type="number" value={form.stock_level} onChange={(e) => setForm({ ...form, stock_level: Number(e.target.value) })} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (comma-separated)</label>
                <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. industrial, heavy-duty" className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20 resize-y" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Image URL</label>
                <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                  Active
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">{editing ? "Update" : "Add"} Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
