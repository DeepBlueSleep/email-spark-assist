import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

interface ProductData {
  sku_code: string;
  name: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  color?: string;
  size?: string;
  material?: string;
  price?: number;
  stock_level?: number;
  description?: string;
  image_url?: string;
  is_active?: boolean;
}

function buildContext(p: ProductData): string {
  const parts = [
    `SKU: ${p.sku_code}`,
    `Product: ${p.name}`,
    p.category ? `Category: ${p.category}` : null,
    p.subcategory ? `Subcategory: ${p.subcategory}` : null,
    p.description ? `Description: ${p.description}` : null,
    p.color ? `Color: ${p.color}` : null,
    p.size ? `Size: ${p.size}` : null,
    p.material ? `Material: ${p.material}` : null,
    p.price ? `Price: $${Number(p.price).toFixed(2)}` : null,
    p.stock_level !== undefined ? `Stock: ${p.stock_level}` : null,
    p.tags?.length ? `Tags: ${p.tags.join(", ")}` : null,
  ];
  return parts.filter(Boolean).join(". ");
}

function buildMetadata(p: ProductData): Record<string, unknown> {
  return {
    sku_code: p.sku_code,
    name: p.name,
    category: p.category || "",
    subcategory: p.subcategory || "",
    tags: p.tags || [],
    color: p.color || "",
    size: p.size || "",
    material: p.material || "",
    price: Number(p.price) || 0,
    stock_level: Number(p.stock_level) || 0,
    description: p.description || "",
    image_url: p.image_url || "",
    is_active: p.is_active ?? true,
  };
}

function getVectorClient() {
  const url = Deno.env.get("VECTOR_DB_URL"); // Supabase project URL (https://xxx.supabase.co)
  const key = Deno.env.get("VECTOR_DB_SERVICE_KEY");
  if (!url || !key) throw new Error("VECTOR_DB_URL or VECTOR_DB_SERVICE_KEY is not set");
  return createClient(url, key);
}

export async function syncProductToVectorStore(product: ProductData) {
  const supabase = getVectorClient();
  const context = buildContext(product);
  const metadata = buildMetadata(product);

  // Check if exists by sku_code in metadata
  const { data: existing, error: selectError } = await supabase
    .from("product_knowledge_base")
    .select("id")
    .eq("metadata->>sku_code", product.sku_code)
    .limit(1);

  if (selectError) {
    throw new Error(`Vector store SELECT failed: ${selectError.message}`);
  }

  if (existing && existing.length > 0) {
    const { error: updateError } = await supabase
      .from("product_knowledge_base")
      .update({ content: context, metadata })
      .eq("id", existing[0].id);

    if (updateError) {
      throw new Error(`Vector store UPDATE failed: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabase
      .from("product_knowledge_base")
      .insert({ context, metadata });

    if (insertError) {
      throw new Error(`Vector store INSERT failed: ${insertError.message}`);
    }
  }
}

export async function syncProductsToVectorStore(products: ProductData[]) {
  for (const product of products) {
    await syncProductToVectorStore(product);
  }
}
