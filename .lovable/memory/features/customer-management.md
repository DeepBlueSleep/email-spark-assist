---
name: Customer Management
description: Customer/debtor schema with code, addresses, credit, discount, agent, BOXX flag
type: feature
---

## Schema (`customers` table — NeonDB)

Core fields: `id`, `code` (unique debtor code like "A169", "BOXX - D020"), `name`, `email` (unique), `phone`, `company`, `notes`.

Credit fields: `credit_limit` (numeric), `credit_terms` (text: "30 days", "C.O.D.", "F.O.C"), `credit_used` (numeric).

Address fields: `address_1`, `address_2`, `address_3` (billing); `delivery_address_1`–`delivery_address_4`.

Other: `fax`, `attention` (contact person), `discount` (text, e.g. "40%+25% (CN)"), `agent` (agent code), `is_boxx` (boolean).

## BOXX Clients

Any customer whose `code` starts with `"BOXX - "` has `is_boxx = true`. A colored amber "BOXX" badge is shown next to the subject line in `EmailDetail.tsx`. Detection also falls back to `customer_name.startsWith("BOXX -")`.

## Edge Functions

- `api-customers`: Full CRUD with all columns. PATCH uses parameterized queries. Supports search by `code` field.
- `mock-autocount`: 17 sample debtors seeded in-memory with `IsBoxx`, `Discount`, `Agent`, address fields.

## Sample Data

17 debtor records seeded from real Autocount export. Placeholder emails used for records without email addresses (`{code}@placeholder.local`).
