import { getDb, corsHeaders } from "../_shared/db.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sql = getDb();

  try {
    // 1. Add new columns
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS alt_code TEXT DEFAULT ''`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS base_uom TEXT DEFAULT ''`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS similar_code TEXT DEFAULT ''`;

    // 2. Clear existing products
    await sql`DELETE FROM products`;

    // 3. Seed sample data
    const products = [
      { sku_code: "0020SM-R", alt_code: "ABN 0020SM-R", name: "Celestial White-SM", description: "Laminate Sht. 4' x 8' x 0.8mm Celestial White-SM (Standard Grade)", stock_level: 292, base_uom: "PC", category: "Laminate", size: "0.8mm", price: 62.00, similar_code: "", is_active: true, subcategory: "Solid - Soft Matt" },
      { sku_code: "0022G-DC", alt_code: "AL 0022G-DC", name: "Black Diamond Glitter", description: "Laminate Sht. 4' x 8' x 1.0mm Black Diamond Glitter (Standard Grade)", stock_level: 97, base_uom: "PC", category: "Laminate", size: "1.0mm", price: 72.00, similar_code: "", is_active: true, subcategory: "Pattern - Glitters" },
      { sku_code: "0030SM", alt_code: "ABN 0030SM", name: "Light Yellow-SM", description: "Laminate Sht. 4' x 8' x 0.8mm Light Yellow-SM (Standard Grade)", stock_level: 112, base_uom: "PC", category: "Laminate", size: "0.8mm", price: 62.00, similar_code: "", is_active: true, subcategory: "Solid - Soft Matt" },
      { sku_code: "0033L", alt_code: "ALG 0033L", name: "Lab White", description: "Laminate Sht. 4' x 8' x 1.0mm Lab White (Standard Grade)", stock_level: 81, base_uom: "PC", category: "Laminate", size: "1.0mm", price: 168.00, similar_code: "", is_active: true, subcategory: "Others - Lab Grade" },
      { sku_code: "0440SM-(RS) D", alt_code: "ABN 0440SM-(RS) D", name: "Pastel-SM", description: "Laminate Sht. 4' x 8' x 0.8mm Pastel-SM (Standard Grade)", stock_level: 49, base_uom: "PC", category: "Laminate", size: "0.8mm", price: 62.00, similar_code: "", is_active: true, subcategory: "Solid - Soft Matt" },
      { sku_code: "0440SM-BD", alt_code: "ABN 0440SM-BD", name: "Pastel-SM", description: "Laminate Sht. 4' x 8' x 0.8mm Pastel-SM (Standard Grade)", stock_level: 210, base_uom: "PC", category: "Laminate", size: "0.8mm", price: 62.00, similar_code: "", is_active: true, subcategory: "Solid - Soft Matt" },
      { sku_code: "002A", alt_code: "AE 002", name: "PVC", description: "PVC edging - Roll(s) Sizes: 23mm x 1mm x 10 meter", stock_level: 168, base_uom: "PC", category: "PVC", size: "1mm", price: 15.00, similar_code: "", is_active: true, subcategory: "" },
      { sku_code: "003A", alt_code: "AE 003", name: "PVC", description: "PVC edging - Roll(s) Sizes: 23mm x 1mm x 10 meter", stock_level: 33, base_uom: "PC", category: "PVC", size: "1mm", price: 15.00, similar_code: "", is_active: true, subcategory: "" },
      { sku_code: "004A", alt_code: "AE 004", name: "PVC", description: "PVC edging - Roll(s) Sizes: 23mm x 1mm x 10 meter", stock_level: 234, base_uom: "PC", category: "PVC", size: "1mm", price: 15.00, similar_code: "", is_active: true, subcategory: "" },
      { sku_code: "BNR-300", alt_code: "BNR-300", name: "BNR-300", description: "Boxx Nouveau Synchronized Runner-300mm", stock_level: 536, base_uom: "SET", category: "Hardware", size: "", price: 24.00, similar_code: "", is_active: true, subcategory: "" },
      { sku_code: "BNR-350", alt_code: "BNR-350", name: "BNR-350", description: "Boxx Nouveau Synchronized Runner-350mm", stock_level: 600, base_uom: "SET", category: "Hardware", size: "", price: 26.00, similar_code: "", is_active: true, subcategory: "" },
      { sku_code: "BNR-400", alt_code: "BNR-400", name: "BNR-400", description: "Boxx Nouveau Synchronized Runner-400mm", stock_level: 656, base_uom: "SET", category: "Hardware", size: "", price: 28.00, similar_code: "", is_active: true, subcategory: "" },
      { sku_code: "BNR-450", alt_code: "BNR-450", name: "BNR-450", description: "Boxx Nouveau Synchronized Runner-450mm", stock_level: 3883, base_uom: "SET", category: "Hardware", size: "", price: 30.00, similar_code: "", is_active: true, subcategory: "" },
      { sku_code: "BNR-500", alt_code: "BNR-500", name: "BNR-500", description: "Boxx Nouveau Synchronized Runner-500mm", stock_level: 3332, base_uom: "SET", category: "Hardware", size: "", price: 32.00, similar_code: "", is_active: true, subcategory: "" },
      { sku_code: "7003SE-D", alt_code: "AWB 7003SE-D", name: "Rustic Shisham Oak", description: "Laminate Sht. 4' x 8' x 0.8mm Rustic Shisham Oak (Standard Grade)", stock_level: 0, base_uom: "PC", category: "Laminate", size: "0.8mm", price: 59.00, similar_code: "AE 1424SE", is_active: true, subcategory: "" },
      { sku_code: "7004SE-D", alt_code: "AWB 7004SE-D", name: "Rustic Brown Oak", description: "Laminate Sht. 4' x 8' x 0.8mm Rustic Brown Oak (Standard Grade)", stock_level: 80, base_uom: "PC", category: "Laminate", size: "0.8mm", price: 59.00, similar_code: "AE 1422SE", is_active: true, subcategory: "Wood - Rustic Oak" },
      { sku_code: "3066SL-D", alt_code: "AZ 3066SL-D", name: "The Sun", description: "Laminate Sht. 4' x 8' x 0.8mm The Sun (Standard Grade)", stock_level: 0, base_uom: "PC", category: "Laminate", size: "0.8mm", price: 64.00, similar_code: "", is_active: false, subcategory: "Pattern - Industrial" },
      { sku_code: "8255QZ-D", alt_code: "ABG 8255QZ-D", name: "Heracles", description: "Laminate Sht. 4' x 8' x 0.9mm Heracles (Standard Grade)", stock_level: 0, base_uom: "PC", category: "Laminate", size: "0.9mm", price: 59.00, similar_code: "", is_active: false, subcategory: "Patterns - Aquario" },
    ];

    for (const p of products) {
      await sql`
        INSERT INTO products (sku_code, alt_code, name, description, stock_level, base_uom, category, size, price, similar_code, is_active, subcategory, tags, color, material, image_url)
        VALUES (${p.sku_code}, ${p.alt_code}, ${p.name}, ${p.description}, ${p.stock_level}, ${p.base_uom}, ${p.category}, ${p.size}, ${p.price}, ${p.similar_code}, ${p.is_active}, ${p.subcategory}, ${[]}, ${''}, ${''},  ${''})
      `;
    }

    return new Response(JSON.stringify({ success: true, count: products.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Migration error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
