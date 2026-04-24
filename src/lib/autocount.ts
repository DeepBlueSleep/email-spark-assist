/**
 * Autocount Integration Service
 * 
 * Points to mock-autocount edge function during development.
 * Swap AUTOCOUNT_BASE_URL to the real Autocount API when available.
 */

import { invokeFunction } from "./api";

const FUNCTION_NAME = "mock-autocount";

// ─── Types matching Autocount's API shape ───────────────────────────────────

export interface ACCustomer {
  AccNo: string;
  CompanyName: string;
  Contact: string;
  Phone1: string;
  EmailAddress: string;
  CreditLimit: number;
  CreditTerms: string;
  OutstandingBalance: number;
  IsActive: boolean;
  Discount?: string;
  Agent?: string;
  Address1?: string;
  Address2?: string;
  Address3?: string;
  Fax?: string;
  Attention?: string;
  DeliveryAddress1?: string;
  DeliveryAddress2?: string;
  DeliveryAddress3?: string;
  DeliveryAddress4?: string;
  IsBoxx?: boolean;
}

export interface ACStockItem {
  ItemCode: string;
  Description: string;
  ItemGroup: string;
  BaseUOM: string;
  UnitPrice: number;
  QtyOnHand: number;
  IsActive: boolean;
}

export interface ACInvoiceDetail {
  ItemCode: string;
  Description: string;
  Qty: number;
  UnitPrice: number;
  Amount: number;
  UOM: string;
}

export interface ACInvoice {
  DocNo: string;
  DocDate: string;
  DebtorCode: string;
  CompanyName: string;
  Details: ACInvoiceDetail[];
  Total: number;
  Outstanding: number;
  Status: "Draft" | "Posted" | "Cancelled";
}

export interface ACCreditCheck {
  AccNo: string;
  CompanyName: string;
  CreditLimit: number;
  OutstandingBalance: number;
  AvailableCredit: number;
  UtilizationPercent: number;
  CreditTerms: string;
  Status: "OK" | "WARNING" | "BLOCKED";
  OutstandingInvoices: { DocNo: string; DocDate: string; Outstanding: number }[];
}

// ─── API Methods ────────────────────────────────────────────────────────────

async function call(path: string, options: { method?: string; body?: any; params?: Record<string, string> } = {}) {
  const { method = "GET", body, params } = options;

  // invokeFunction builds the URL as BASE_URL/functionName
  // We need to append our sub-path, so we encode it into the function name
  const functionPath = `${FUNCTION_NAME}/${path}`;

  return invokeFunction(functionPath, { method, body, params });
}

/** List or search customers */
export async function getCustomers(search?: string): Promise<{ customers: ACCustomer[]; total: number }> {
  return call("customers", { params: search ? { search } : undefined });
}

/** Get single customer by AccNo */
export async function getCustomer(accNo: string): Promise<ACCustomer> {
  return call(`customers/${accNo}`);
}

/** Create or update customer */
export async function upsertCustomer(data: Partial<ACCustomer>): Promise<{ success: boolean; customer: ACCustomer }> {
  return call("customers", { method: "POST", body: data });
}

/** List stock items, optionally by group or specific SKU */
export async function getStock(opts?: { sku?: string; group?: string }): Promise<{ items: ACStockItem[]; total: number } | ACStockItem> {
  const params: Record<string, string> = {};
  if (opts?.sku) params.sku = opts.sku;
  if (opts?.group) params.group = opts.group;
  return call("stock", { params });
}

/** Create a sales invoice */
export async function createInvoice(data: {
  DebtorCode: string;
  Details: { ItemCode: string; Qty: number; UnitPrice?: number; UOM?: string }[];
}): Promise<{ success: boolean; invoice: ACInvoice } | { error: string; credit_limit: number; current_outstanding: number; invoice_total: number; shortfall: number }> {
  return call("invoices", { method: "POST", body: data });
}

/** List invoices, optionally filtered by customer */
export async function getInvoices(customerCode?: string): Promise<{ invoices: ACInvoice[]; total: number }> {
  return call("invoices", { params: customerCode ? { customer_code: customerCode } : undefined });
}

/** Record a payment */
export async function recordPayment(data: {
  DebtorCode: string;
  Amount: number;
  PaymentMethod?: string;
  Reference?: string;
  InvoiceAllocations?: { InvoiceNo: string; Amount: number }[];
}): Promise<{ success: boolean; payment: any }> {
  return call("payments", { method: "POST", body: data });
}

/** Check customer credit status */
export async function checkCredit(customerCode: string): Promise<ACCreditCheck> {
  return call("credit-check", { params: { customer_code: customerCode } });
}

/** List payments, optionally by customer */
export async function getPayments(customerCode?: string): Promise<{ payments: any[]; total: number }> {
  return call("payments", { params: customerCode ? { customer_code: customerCode } : undefined });
}

// ─── Status Workflow Hooks (stubs for future Autocount integration) ─────────
// These endpoints don't exist yet on the mock or live API. They're wired up so
// that when the real Autocount webhooks are available, only AUTOCOUNT_BASE_URL
// (or the path strings below) need to change. All calls are non-blocking:
// failures are logged but won't prevent the local status update from happening.

export interface ACStatusActionPayload {
  email_id: string;
  customer_code?: string | null;
  customer_name: string;
  customer_email: string;
  subject: string;
  intent?: string | null;
  triggered_at: string;
  // Action-specific extras
  [key: string]: any;
}

async function postStatusAction(path: string, payload: ACStatusActionPayload) {
  try {
    // Currently routed to the mock-autocount edge function.
    // Swap to the real Autocount webhook URL when integration is ready.
    const result = await call(path, { method: "POST", body: payload });
    console.log(`[autocount] ${path} →`, result);
    return result;
  } catch (err) {
    console.warn(`[autocount] ${path} failed (non-blocking):`, err);
    return null;
  }
}

/** Approve & Send → push sales order / quotation to Autocount */
export async function pushApprovedOrder(payload: ACStatusActionPayload & {
  order_total: number;
  order_items: Array<{ ItemCode: string; Description: string; Qty: number; UnitPrice: number }>;
  reply_tone?: string;
  reply_draft?: string;
}) {
  return postStatusAction("workflow/approve-order", payload);
}

/** Request More Info → log a follow-up activity against the customer */
export async function pushRequestInfo(payload: ACStatusActionPayload & {
  message: string;
}) {
  return postStatusAction("workflow/request-info", payload);
}

/** Reject / Escalate → flag the email/order for manager review */
export async function pushEscalation(payload: ACStatusActionPayload & {
  reason: string;
}) {
  return postStatusAction("workflow/escalate", payload);
}

/** Stock In Process → open a restock case for admin review when inventory is low/unavailable */
export async function pushStockInProcess(payload: ACStatusActionPayload & {
  insufficient_items: Array<{ ItemCode: string; Description: string; Requested: number; Available: number; Shortfall: number }>;
  order_total: number;
}) {
  return postStatusAction("workflow/stock-in-process", payload);
}
