

## Plan: Add 3 New Product Columns, Clear Old Data, Seed Sample SKUs

### What changes

1. **Add 3 columns to `products` table in NeonDB** via the api-products edge function (or a dedicated SQL call):
   - `alt_code` (text) — maps from "Desc 2" column
   - `base_uom` (text) — Unit of Measure (PC, SET, etc.)
   - `similar_code` (text) — similar/replacement SKU reference

   SQL to run against NeonDB:
   ```sql
   ALTER TABLE products ADD COLUMN IF NOT EXISTS alt_code TEXT DEFAULT '';
   ALTER TABLE products ADD COLUMN IF NOT EXISTS base_uom TEXT DEFAULT '';
   ALTER TABLE products ADD COLUMN IF NOT EXISTS similar_code TEXT DEFAULT '';
   ```

2. **Delete all existing products** from NeonDB.

3. **Seed 19 sample SKU records** with the data you provided, mapping:
   - `Item Code` → `sku_code`
   - `Desc 2` → `alt_code`
   - `Description` → `description`
   - `Total Bal. Qty` → `stock_level`
   - `Base UOM` → `base_uom`
   - `Item Name` → `name`
   - `Item Group` → `category`
   - `Thickness` → `size`
   - `Retail Price` → `price`
   - `Similar Code` → `similar_code`
   - `Discon` → `is_active` (false if "Discon" text present, true otherwise)
   - `Collections` → `subcategory`

4. **Update edge functions** to include the 3 new columns:
   - `api-products/index.ts` — POST insert, PATCH update, GET queries
   - `webhook-products/index.ts` — upsert logic
   - `get-products/index.ts` — no change needed (uses `SELECT *`)

5. **Update frontend** `src/pages/Products.tsx`:
   - Add `alt_code`, `base_uom`, `similar_code` to the `Product` interface and form
   - Display in the product list/table

6. **Update vector sync** if it references product fields (will check `_shared/vectorSync.ts`).

### Steps to execute
1. Create a small edge function or use curl to run the ALTER TABLE + DELETE + INSERT statements against NeonDB
2. Update `api-products/index.ts` POST and PATCH to include new columns
3. Update `webhook-products/index.ts` upsert to include new columns
4. Update `Products.tsx` interface, form, and display table

