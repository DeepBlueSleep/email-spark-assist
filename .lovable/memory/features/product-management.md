---
name: Product Management
description: HPL products schema with alt_code, base_uom, similar_code columns. Manual/bulk CRUD via edge functions.
type: feature
---
The product management module at /products supports manual CRUD and bulk ingestion. The knowledge base is focused on HPL laminate, PVC edging, and hardware products.

Schema columns: id, sku_code, alt_code (Desc 2/alternate code), name, category, subcategory (collections), tags, color, size (thickness), material, price, stock_level, description, image_url, is_active, base_uom (PC/SET), similar_code (replacement SKU reference), created_at, updated_at.

Edge functions: api-products (GET/POST/PATCH/DELETE), webhook-products (bulk upsert), get-products (filtered read).

Discontinued products have is_active = false. Products with similar_code reference alternative/replacement SKUs.
