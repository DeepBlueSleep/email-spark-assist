# Project Memory

## Core
Light theme SaaS dashboard, desktop-first, side-by-side layout (email list + detail). Format labels in Title Case.
Supabase Edge Functions + NeonDB (@neondatabase/serverless).
Cast NeonDB numeric/decimal types with Number() (driver returns strings).
Use US dollars ($) for all currencies.
Use parameterized queries only, no sql.unsafe(). Use COALESCE for partial updates.
Use 10s polling for real-time updates (no WebSockets).
WhatsApp integration is out of scope.
Human-in-the-loop dashboard for processing customer emails through AI.

## Memories
- [AI Analysis Logic](mem://features/ai-analysis-logic) — Intents, confidence scores, UI warnings
- [Status Transitions](mem://workflow/status-transitions) — Centralized statuses and transition rules
- [n8n Gmail Integration](mem://tech/n8n-gmail-integration) — Recursive payload unwrapping and parsing
- [AI Reply Drafting](mem://features/ai-reply-drafting) — Multi-tone drafts, inline editing
- [Order Data Extraction](mem://features/order-data-extraction) — Read-only AI structured order data
- [Product Management](mem://features/product-management) — HPL products, manual/bulk CRUD
- [Live Data Indicator](mem://features/live-data-indicator) — NeonDB vs mock data visual indicator
- [Dashboard Display](mem://ui/dashboard-display-logic) — State management and conditional rendering
- [AI Enrichment Schema](mem://tech/api-schemas/webhook-ai-enrichment) — Webhook schema, partial updates
- [Draft Order Workspace](mem://features/draft-order-workspace) — Interactive order builder and real-time sums
- [API Layer](mem://tech/api-layer) — Internal fetch API via Edge Functions
- [UUID Validation](mem://tech/uuid-validation) — Explicit UUID validation in Edge Functions
- [Attachments System](mem://features/attachments-system) — Base64 storage, slide-in panel, previews
- [Customer Management](mem://features/customer-management) — Debtor schema with code, addresses, credit, discount, agent, BOXX flag
- [SKU Recommendations](mem://features/sku-recommendations) — Stock filtering and quantity caps
- [NeonDB Standards](mem://tech/neondb-integration-standards) — Connection routing, custom auth, POST-only
- [Credit Enforcement](mem://features/credit-enforcement-workflow) — Hard blocks for credit limit breaches
- [Order Approval Sync](mem://features/order-approval-sync) — Payload sync to n8n upon approval
- [CORS Proxy](mem://tech/cors-proxy-architecture) — Edge proxy for outgoing external requests
- [Product Vector Sync](mem://tech/product-vector-sync) — OpenAI embeddings sync to Supabase vector store
- [External API Security](mem://tech/external-api-access-security) — Auth bypass and WEBHOOK_SECRET
- [Autocount Integration](mem://features/autocount-integration-mock) — Mock ERP simulator for stock/credit
