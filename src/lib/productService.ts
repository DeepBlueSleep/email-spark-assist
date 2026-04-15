/**
 * Product Service Abstraction Layer
 *
 * Currently returns hardcoded sample SKU data for testing/demo purposes.
 * When the external product API is ready, replace the implementation of
 * these functions with fetch() calls to the external API endpoint.
 *
 * Only this file needs to change — all consumers use these exported functions.
 */

export interface Product {
  sku_code: string;
  alt_code: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  size: string;
  price: number;
  stock_level: number;
  base_uom: string;
  similar_code: string;
  is_active: boolean;
  color: string;
  material: string;
  image_url: string;
  tags: string[];
}

// ─── Sample SKU data (replace with external API calls) ───────────────────────
const SAMPLE_PRODUCTS: Product[] = [
  {
    sku_code: "0020SM-R",
    alt_code: "ABN 0020SM-R",
    name: "Celestial White-SM",
    description: "Laminate Sht. 4' x 8' x 0.8mm Celestial White-SM (Standard Grade)",
    category: "Laminate",
    subcategory: "Solid - Soft Matt",
    size: "0.8mm",
    price: 62.00,
    stock_level: 292,
    base_uom: "PC",
    similar_code: "",
    is_active: true,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "0022G-DC",
    alt_code: "AL 0022G-DC",
    name: "Black Diamond Glitter",
    description: "Laminate Sht. 4' x 8' x 1.0mm Black Diamond Glitter (Standard Grade)",
    category: "Laminate",
    subcategory: "Pattern - Glitters",
    size: "1.0mm",
    price: 72.00,
    stock_level: 97,
    base_uom: "PC",
    similar_code: "",
    is_active: true,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "0090SM-R",
    alt_code: "ABN 0090SM-R",
    name: "Bianco-SM",
    description: "Laminate Sht. 4' x 8' x 0.8mm Bianco-SM (Standard Grade)",
    category: "Laminate",
    subcategory: "Solid - Soft Matt",
    size: "0.8mm",
    price: 62.00,
    stock_level: 154,
    base_uom: "PC",
    similar_code: "",
    is_active: true,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "1108SE-D",
    alt_code: "AWB 1108SE-D",
    name: "Classic Walnut",
    description: "Laminate Sht. 4' x 8' x 0.8mm Classic Walnut (Standard Grade)",
    category: "Laminate",
    subcategory: "Wood - Classic",
    size: "0.8mm",
    price: 59.00,
    stock_level: 195,
    base_uom: "PC",
    similar_code: "",
    is_active: true,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "1109SE-D",
    alt_code: "AWB 1109SE-D",
    name: "Natural Walnut",
    description: "Laminate Sht. 4' x 8' x 0.8mm Natural Walnut (Standard Grade)",
    category: "Laminate",
    subcategory: "Wood - Classic",
    size: "0.8mm",
    price: 59.00,
    stock_level: 120,
    base_uom: "PC",
    similar_code: "",
    is_active: true,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "1207SE-D",
    alt_code: "AWB 1207SE-D",
    name: "Chestnut Oak",
    description: "Laminate Sht. 4' x 8' x 0.8mm Chestnut Oak (Standard Grade)",
    category: "Laminate",
    subcategory: "Wood - Classic",
    size: "0.8mm",
    price: 59.00,
    stock_level: 256,
    base_uom: "PC",
    similar_code: "",
    is_active: true,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "1302FN-D",
    alt_code: "AWB 1302FN-D",
    name: "Natural Teak-FN",
    description: "Laminate Sht. 4' x 8' x 0.8mm Natural Teak-FN (Standard Grade)",
    category: "Laminate",
    subcategory: "Wood - Classic",
    size: "0.8mm",
    price: 62.00,
    stock_level: 108,
    base_uom: "PC",
    similar_code: "",
    is_active: true,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "1401SE-D",
    alt_code: "AWB 1401SE-D",
    name: "Knotty Ash",
    description: "Laminate Sht. 4' x 8' x 0.8mm Knotty Ash (Standard Grade)",
    category: "Laminate",
    subcategory: "Wood - Classic",
    size: "0.8mm",
    price: 59.00,
    stock_level: 62,
    base_uom: "PC",
    similar_code: "",
    is_active: true,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "2003MT-D",
    alt_code: "AZ 2003MT-D",
    name: "Grigio Marble-MT",
    description: "Laminate Sht. 4' x 8' x 0.8mm Grigio Marble-MT (Standard Grade)",
    category: "Laminate",
    subcategory: "Stone - Marble",
    size: "0.8mm",
    price: 62.00,
    stock_level: 83,
    base_uom: "PC",
    similar_code: "",
    is_active: true,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "2318SE-D",
    alt_code: "AZ 2318SE-D",
    name: "Grey Soapstone",
    description: "Laminate Sht. 4' x 8' x 0.8mm Grey Soapstone (Standard Grade)",
    category: "Laminate",
    subcategory: "Stone - Marble",
    size: "0.8mm",
    price: 59.00,
    stock_level: 0,
    base_uom: "PC",
    similar_code: "2319SE",
    is_active: true,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "2319SE-D",
    alt_code: "AZ 2319SE-D",
    name: "Charcoal Soapstone",
    description: "Laminate Sht. 4' x 8' x 0.8mm Charcoal Soapstone (Standard Grade)",
    category: "Laminate",
    subcategory: "Stone - Marble",
    size: "0.8mm",
    price: 59.00,
    stock_level: 145,
    base_uom: "PC",
    similar_code: "",
    is_active: true,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "3055G-D",
    alt_code: "AZ 3055G-D",
    name: "Titanium",
    description: "Laminate Sht. 4' x 8' x 0.8mm Titanium (Standard Grade)",
    category: "Laminate",
    subcategory: "Pattern - Industrial",
    size: "0.8mm",
    price: 59.00,
    stock_level: 200,
    base_uom: "PC",
    similar_code: "",
    is_active: true,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "3066SL-D",
    alt_code: "AZ 3066SL-D",
    name: "The Sun",
    description: "Laminate Sht. 4' x 8' x 0.8mm The Sun (Standard Grade)",
    category: "Laminate",
    subcategory: "Pattern - Industrial",
    size: "0.8mm",
    price: 64.00,
    stock_level: 0,
    base_uom: "PC",
    similar_code: "",
    is_active: false,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "5005RR-D",
    alt_code: "AWB 5005RR-D",
    name: "Rustic Shisham Oak",
    description: "Laminate Sht. 4' x 8' x 0.8mm Rustic Shisham Oak (Standard Grade)",
    category: "Laminate",
    subcategory: "Wood - Rustic Oak",
    size: "0.8mm",
    price: 59.00,
    stock_level: 0,
    base_uom: "PC",
    similar_code: "AE 1424SE",
    is_active: true,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "7004SE-D",
    alt_code: "AWB 7004SE-D",
    name: "Rustic Brown Oak",
    description: "Laminate Sht. 4' x 8' x 0.8mm Rustic Brown Oak (Standard Grade)",
    category: "Laminate",
    subcategory: "Wood - Rustic Oak",
    size: "0.8mm",
    price: 59.00,
    stock_level: 80,
    base_uom: "PC",
    similar_code: "AE 1422SE",
    is_active: true,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
  {
    sku_code: "8255QZ-D",
    alt_code: "ABG 8255QZ-D",
    name: "Heracles",
    description: "Laminate Sht. 4' x 8' x 0.9mm Heracles (Standard Grade)",
    category: "Laminate",
    subcategory: "Patterns - Aquario",
    size: "0.9mm",
    price: 59.00,
    stock_level: 0,
    base_uom: "PC",
    similar_code: "",
    is_active: false,
    color: "",
    material: "",
    image_url: "",
    tags: [],
  },
];
// ─── End sample data ─────────────────────────────────────────────────────────

/**
 * Get all products (optionally filtered by active status).
 * TODO: Replace with fetch() to external product API.
 */
export async function getAllProducts(options?: { activeOnly?: boolean }): Promise<Product[]> {
  // --- SWAP POINT: replace with external API call ---
  let results = [...SAMPLE_PRODUCTS];
  if (options?.activeOnly) {
    results = results.filter((p) => p.is_active);
  }
  return results;
}

/**
 * Search products by query string (matches sku_code, name, alt_code, description).
 * TODO: Replace with fetch() to external product API search endpoint.
 */
export async function searchProducts(query: string): Promise<Product[]> {
  // --- SWAP POINT: replace with external API call ---
  const q = query.trim().toUpperCase();
  if (!q) return [];
  return SAMPLE_PRODUCTS.filter(
    (p) =>
      p.is_active &&
      (p.sku_code.toUpperCase().includes(q) ||
        p.name.toUpperCase().includes(q) ||
        p.alt_code.toUpperCase().includes(q) ||
        p.description.toUpperCase().includes(q))
  );
}

/**
 * Look up a single product by SKU code.
 * TODO: Replace with fetch() to external product API.
 */
export async function getProductBySku(skuCode: string): Promise<Product | undefined> {
  // --- SWAP POINT: replace with external API call ---
  const normalized = skuCode.trim().toUpperCase();
  return SAMPLE_PRODUCTS.find((p) => p.sku_code.toUpperCase() === normalized);
}

/**
 * Look up multiple products by SKU codes.
 * TODO: Replace with fetch() to external product API.
 */
export async function getProductsBySkuCodes(skuCodes: string[]): Promise<Product[]> {
  // --- SWAP POINT: replace with external API call ---
  const normalized = skuCodes.map((s) => s.trim().toUpperCase());
  return SAMPLE_PRODUCTS.filter((p) => normalized.includes(p.sku_code.toUpperCase()));
}
