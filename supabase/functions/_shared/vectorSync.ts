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

function getVectorStoreConfig() {
  const url = Deno.env.get("VECTOR_DB_URL"); // Supabase project URL e.g. https://xxx.supabase.co
  const key = Deno.env.get("VECTOR_DB_SERVICE_KEY"); // Service role key for the vector store project
  if (!url || !key) throw new Error("VECTOR_DB_URL or VECTOR_DB_SERVICE_KEY is not set");
  return { url: url.replace(/\/$/, ""), key };
}

export async function syncProductToVectorStore(product: ProductData) {
  const { url, key } = getVectorStoreConfig();
  const context = buildContext(product);
  const metadata = buildMetadata(product);

  const headers = {
    "Content-Type": "application/json",
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Prefer": "return=representation",
  };

  // Check if exists by sku_code in metadata
  const selectRes = await fetch(
    `${url}/rest/v1/product_knowledge_base?metadata->>sku_code=eq.${encodeURIComponent(product.sku_code)}&select=id&limit=1`,
    { headers }
  );

  if (!selectRes.ok) {
    throw new Error(`Vector store SELECT failed: ${selectRes.status} ${await selectRes.text()}`);
  }

  const existing = await selectRes.json();

  if (existing.length > 0) {
    const updateRes = await fetch(
      `${url}/rest/v1/product_knowledge_base?id=eq.${existing[0].id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ context, metadata }),
      }
    );
    if (!updateRes.ok) {
      throw new Error(`Vector store UPDATE failed: ${updateRes.status} ${await updateRes.text()}`);
    }
  } else {
    const insertRes = await fetch(
      `${url}/rest/v1/product_knowledge_base`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ context, metadata }),
      }
    );
    if (!insertRes.ok) {
      throw new Error(`Vector store INSERT failed: ${insertRes.status} ${await insertRes.text()}`);
    }
  }
}

export async function syncProductsToVectorStore(products: ProductData[]) {
  for (const product of products) {
    await syncProductToVectorStore(product);
  }
}
