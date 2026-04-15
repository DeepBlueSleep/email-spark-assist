## Plan: Keep Sample Data as Static Fallback, Prepare for External API Swap

### Approach

Instead of removing the product infrastructure, refactor it into a **product service abstraction layer** that currently returns hardcoded sample data but can be swapped to an external API with minimal changes.

### What changes

1. **Create `src/lib/productService.ts**` — a single module that exports product query functions (`searchProducts`, `getProductBySku`, `getAllProducts`). Initially these return data from a hardcoded array of the 18 sample SKUs. When the external API is ready, only this file needs to change.
2. **Update `src/components/DraftOrder.tsx**` — replace the `invokeFunction("api-products", ...)` call with `searchProducts()` from the new service module.
3. **Update `src/hooks/useEmails.ts**` — replace the product lookup logic (lines 27-31 that use `productsArr` from api-emails) with a call to the product service.
4. **Update `supabase/functions/api-emails/index.ts**` — remove the product query block (lines 44-61) that fetches from the NeonDB `products` table. Return `products: []` in the response — the frontend will handle product lookups via the service layer instead.
5. **Keep `src/pages/Products.tsx` and `/products` route** as a read-only product catalog view, but source data from the product service instead of `api-products`. Remove create/edit/delete functionality (since products come from an external source).
6. **Delete edge functions no longer needed**:
  - `supabase/functions/api-products/index.ts` — internal CRUD
  - `supabase/functions/webhook-products/index.ts` — bulk upsert
  - `supabase/functions/get-products/index.ts` — filtered read
  - `supabase/functions/_shared/vectorSync.ts` — embeddings sync
7. **NeonDB `products` table** — leave it for now (no harm), or drop it. Data will come from the service layer.
8. **Update memory files** to reflect the new architecture.
9. Remove the`src/pages/Products.tsx` **and** `/products` **route and page**

### Sample data location

The 18 SKU records you provided will live as a typed array in `src/lib/productService.ts`. The service functions will filter/search this array in-memory.

### Swap-over prep

The service module will have clear comments marking where to replace static data with `fetch()` calls to the external API. The `Product` interface stays the same.

### Files affected

- **Create**: `src/lib/productService.ts`
- **Edit**: `src/components/DraftOrder.tsx`, `src/hooks/useEmails.ts`, `supabase/functions/api-emails/index.ts`
- **Delete**: `supabase/functions/api-products/index.ts`, `supabase/functions/webhook-products/index.ts`, `supabase/functions/get-products/index.ts`, `supabase/functions/_shared/vectorSync.ts, src/pages/Products.tsx`