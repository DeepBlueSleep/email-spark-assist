import { neon } from "https://esm.sh/@neondatabase/serverless@0.10.4";

function getVectorDb() {
  const url = Deno.env.get("VECTOR_DB_URL");
  if (!url) throw new Error("VECTOR_DB_URL is not set");
  return neon(url);
}

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

export async function syncProductToVectorStore(product: ProductData) {
  const sql = getVectorDb();
  const context = buildContext(product);
  const metadata = buildMetadata(product);

  // Upsert by sku_code in metadata — first check if exists
  const existing = await sql`
    SELECT id FROM product_knowledge_base WHERE metadata->>'sku_code' = ${product.sku_code} LIMIT 1
  `;

  if (existing.length > 0) {
    await sql`
      UPDATE product_knowledge_base SET context = ${context}, metadata = ${JSON.stringify(metadata)}::jsonb WHERE id = ${existing[0].id}
    `;
  } else {
    await sql`
      INSERT INTO product_knowledge_base (context, metadata) VALUES (${context}, ${JSON.stringify(metadata)}::jsonb)
    `;
  }
}

export async function syncProductsToVectorStore(products: ProductData[]) {
  for (const product of products) {
    await syncProductToVectorStore(product);
  }
}
