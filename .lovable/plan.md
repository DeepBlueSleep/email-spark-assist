

## Plan: Seed Sample Debtor Data and Add BOXX Client Label

### What changes

1. **Add 12 new columns to `customers` table** (NeonDB via api-customers edge function or direct SQL):
   - `code` (text, unique) — debtor account code
   - `address_1`, `address_2`, `address_3` (text)
   - `fax` (text)
   - `attention` (text) — contact person
   - `discount` (text) — stored as text for values like "40%+25% (CN)", "F.O.C"
   - `agent` (text) — agent code
   - `delivery_address_1`, `delivery_address_2`, `delivery_address_3`, `delivery_address_4` (text)
   - `is_boxx` (boolean, default false) — derived from whether code starts with "BOXX -"

2. **Clear existing customers and seed 17 sample debtors** into NeonDB. For records without email, use `{code_sanitized}@placeholder.local`. Map credit_terms: "30 days" → "30 days", "C.O.D." → "C.O.D.", "F.O.C" → "F.O.C". Credit limit is numeric (0 for F.O.C entries).

3. **Update `api-customers` edge function** — add new columns to POST (upsert), PATCH (parameterized queries replacing `sql.unsafe()`), and GET responses. Add search support for `code` field.

4. **Update mock-autocount seed data** — replace the 3 dummy customers with the 17 sample debtors, adding `Discount`, `Agent`, `Address`, `IsBoxx` fields to the `ACCustomer` interface.

5. **Update `Customer` interface** in `src/data/mockData.ts` — add optional fields: `code`, `address_1`–`address_3`, `fax`, `attention`, `discount`, `agent`, `delivery_address_1`–`delivery_address_4`, `is_boxx`.

6. **Update `ACCustomer` interface** in `src/lib/autocount.ts` — add `Discount`, `Agent`, `Address1`–`Address3`, `Fax`, `Attention`, `DeliveryAddress1`–`DeliveryAddress4` fields.

7. **Add BOXX badge to UI** — in `EmailDetail.tsx` (or wherever customer info is displayed), show a colored "BOXX" badge next to the customer name when `is_boxx` is true. Also show it in `DraftOrder.tsx` if customer details are visible there.

8. **Update memory** — revise `mem://features/customer-management` with new schema and BOXX flag.

### BOXX detection logic
Any customer whose `code` starts with `"BOXX - "` gets `is_boxx = true`. This is set at seed/insert time and can be used for display without string parsing on the frontend.

### Files affected
- **NeonDB schema**: ALTER TABLE + DELETE + INSERT (via edge function call)
- **Edit**: `supabase/functions/api-customers/index.ts`, `supabase/functions/mock-autocount/index.ts`, `src/data/mockData.ts`, `src/lib/autocount.ts`
- **Edit (UI)**: `src/components/EmailDetail.tsx`, `src/components/DraftOrder.tsx` — BOXX badge
- **Memory**: `mem://features/customer-management`

