import { corsHeaders } from "../_shared/db.ts";

/**
 * Mock Autocount API — simulates Autocount's REST API endpoints.
 * Endpoints:
 *   GET/POST   /customers       — list / create-or-update customer
 *   GET        /customers/:code — get customer by code
 *   GET        /stock           — list stock items (optional ?sku=...)
 *   POST       /invoices        — create sales invoice
 *   GET        /invoices        — list invoices (optional ?customer_code=...)
 *   POST       /payments        — record payment
 *   GET        /credit-check    — check customer credit (?customer_code=...)
 *
 * All data is in-memory (resets on cold start) — for dev/testing only.
 */

// ─── In-memory mock data ────────────────────────────────────────────────────

interface ACCustomer {
  AccNo: string;
  CompanyName: string;
  Contact: string;
  Phone1: string;
  EmailAddress: string;
  CreditLimit: number;
  CreditTerms: string;
  OutstandingBalance: number;
  IsActive: boolean;
}

interface ACStockItem {
  ItemCode: string;
  Description: string;
  ItemGroup: string;
  BaseUOM: string;
  UnitPrice: number;
  QtyOnHand: number;
  IsActive: boolean;
}

interface ACInvoiceDetail {
  ItemCode: string;
  Description: string;
  Qty: number;
  UnitPrice: number;
  Amount: number;
  UOM: string;
}

interface ACInvoice {
  DocNo: string;
  DocDate: string;
  DebtorCode: string;
  CompanyName: string;
  Details: ACInvoiceDetail[];
  Total: number;
  Outstanding: number;
  Status: "Draft" | "Posted" | "Cancelled";
}

interface ACPayment {
  DocNo: string;
  DocDate: string;
  DebtorCode: string;
  Amount: number;
  PaymentMethod: string;
  Reference: string;
  InvoiceAllocations: { InvoiceNo: string; Amount: number }[];
}

// ─── Seed data ──────────────────────────────────────────────────────────────

const customers: Map<string, ACCustomer> = new Map([
  ["300-C001", {
    AccNo: "300-C001",
    CompanyName: "ABC Trading Sdn Bhd",
    Contact: "Ahmad bin Ibrahim",
    Phone1: "+60-12-345-6789",
    EmailAddress: "ahmad@abctrading.com.my",
    CreditLimit: 50000,
    CreditTerms: "Net 30",
    OutstandingBalance: 12450.80,
    IsActive: true,
  }],
  ["300-C002", {
    AccNo: "300-C002",
    CompanyName: "XYZ Interiors Sdn Bhd",
    Contact: "Siti Nurhaliza",
    Phone1: "+60-11-987-6543",
    EmailAddress: "siti@xyzinteriors.com.my",
    CreditLimit: 30000,
    CreditTerms: "Net 14",
    OutstandingBalance: 28500.00,
    IsActive: true,
  }],
  ["300-C003", {
    AccNo: "300-C003",
    CompanyName: "Quick Renovations",
    Contact: "Lee Wei Ming",
    Phone1: "+60-16-555-1234",
    EmailAddress: "weiming@quickreno.com",
    CreditLimit: 20000,
    CreditTerms: "COD",
    OutstandingBalance: 0,
    IsActive: true,
  }],
]);

const stockItems: Map<string, ACStockItem> = new Map([
  ["LAM-001", { ItemCode: "LAM-001", Description: "Premium Oak Laminate 8mm", ItemGroup: "Laminate", BaseUOM: "sqft", UnitPrice: 4.50, QtyOnHand: 15000, IsActive: true }],
  ["LAM-002", { ItemCode: "LAM-002", Description: "Dark Walnut Laminate 12mm", ItemGroup: "Laminate", BaseUOM: "sqft", UnitPrice: 6.80, QtyOnHand: 8500, IsActive: true }],
  ["LAM-003", { ItemCode: "LAM-003", Description: "Light Maple Laminate 8mm", ItemGroup: "Laminate", BaseUOM: "sqft", UnitPrice: 4.20, QtyOnHand: 22000, IsActive: true }],
  ["VNL-001", { ItemCode: "VNL-001", Description: "Luxury Vinyl Plank 5mm", ItemGroup: "Vinyl", BaseUOM: "sqft", UnitPrice: 7.50, QtyOnHand: 5000, IsActive: true }],
  ["VNL-002", { ItemCode: "VNL-002", Description: "SPC Click Vinyl 4mm", ItemGroup: "Vinyl", BaseUOM: "sqft", UnitPrice: 5.90, QtyOnHand: 12000, IsActive: true }],
  ["ACC-001", { ItemCode: "ACC-001", Description: "Underlay Foam 3mm", ItemGroup: "Accessories", BaseUOM: "sqft", UnitPrice: 1.20, QtyOnHand: 30000, IsActive: true }],
  ["ACC-002", { ItemCode: "ACC-002", Description: "T-Moulding Transition Strip", ItemGroup: "Accessories", BaseUOM: "pcs", UnitPrice: 15.00, QtyOnHand: 500, IsActive: true }],
  ["ACC-003", { ItemCode: "ACC-003", Description: "Adhesive Glue 5kg", ItemGroup: "Accessories", BaseUOM: "pail", UnitPrice: 35.00, QtyOnHand: 200, IsActive: true }],
]);

const invoices: Map<string, ACInvoice> = new Map([
  ["INV-2026-0001", {
    DocNo: "INV-2026-0001",
    DocDate: "2026-03-15",
    DebtorCode: "300-C001",
    CompanyName: "ABC Trading Sdn Bhd",
    Details: [
      { ItemCode: "LAM-001", Description: "Premium Oak Laminate 8mm", Qty: 2000, UnitPrice: 4.50, Amount: 9000, UOM: "sqft" },
      { ItemCode: "ACC-001", Description: "Underlay Foam 3mm", Qty: 2000, UnitPrice: 1.20, Amount: 2400, UOM: "sqft" },
    ],
    Total: 11400,
    Outstanding: 11400,
    Status: "Posted",
  }],
  ["INV-2026-0002", {
    DocNo: "INV-2026-0002",
    DocDate: "2026-03-20",
    DebtorCode: "300-C002",
    CompanyName: "XYZ Interiors Sdn Bhd",
    Details: [
      { ItemCode: "LAM-002", Description: "Dark Walnut Laminate 12mm", Qty: 3000, UnitPrice: 6.80, Amount: 20400, UOM: "sqft" },
    ],
    Total: 20400,
    Outstanding: 20400,
    Status: "Posted",
  }],
]);

const payments: ACPayment[] = [
  {
    DocNo: "PV-2026-0001",
    DocDate: "2026-03-10",
    DebtorCode: "300-C001",
    Amount: 1050.20,
    PaymentMethod: "Bank Transfer",
    Reference: "TT-20260310-ABC",
    InvoiceAllocations: [],
  },
];

let invoiceCounter = 3;
let paymentCounter = 2;

// ─── Route handler ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Path after /mock-autocount, e.g. "/customers" or "/customers/300-C001"
  const pathParts = url.pathname.replace(/^\/mock-autocount\/?/, "").split("/").filter(Boolean);
  const resource = pathParts[0] || "";
  const resourceId = pathParts[1] || null;

  try {
    // ── CUSTOMERS ───────────────────────────────────────────────────────
    if (resource === "customers") {
      if (req.method === "GET") {
        if (resourceId) {
          const c = customers.get(resourceId);
          if (!c) return json({ error: "Customer not found" }, 404);
          return json(c);
        }
        const search = url.searchParams.get("search")?.toLowerCase();
        let list = [...customers.values()];
        if (search) {
          list = list.filter(c =>
            c.CompanyName.toLowerCase().includes(search) ||
            c.AccNo.toLowerCase().includes(search) ||
            c.EmailAddress.toLowerCase().includes(search)
          );
        }
        return json({ customers: list, total: list.length });
      }

      if (req.method === "POST") {
        const body = await req.json();
        const accNo = body.AccNo || `300-C${String(customers.size + 1).padStart(3, "0")}`;
        const customer: ACCustomer = {
          AccNo: accNo,
          CompanyName: body.CompanyName || "",
          Contact: body.Contact || "",
          Phone1: body.Phone1 || "",
          EmailAddress: body.EmailAddress || "",
          CreditLimit: body.CreditLimit ?? 0,
          CreditTerms: body.CreditTerms || "Net 30",
          OutstandingBalance: body.OutstandingBalance ?? 0,
          IsActive: body.IsActive ?? true,
        };
        customers.set(accNo, customer);
        return json({ success: true, customer });
      }
    }

    // ── STOCK ───────────────────────────────────────────────────────────
    if (resource === "stock") {
      if (req.method === "GET") {
        const sku = url.searchParams.get("sku");
        const group = url.searchParams.get("group");
        let list = [...stockItems.values()];
        if (sku) {
          const item = stockItems.get(sku.toUpperCase());
          if (!item) return json({ error: "Item not found" }, 404);
          return json(item);
        }
        if (group) {
          list = list.filter(i => i.ItemGroup.toLowerCase() === group.toLowerCase());
        }
        return json({ items: list, total: list.length });
      }
    }

    // ── INVOICES ────────────────────────────────────────────────────────
    if (resource === "invoices") {
      if (req.method === "GET") {
        const customerCode = url.searchParams.get("customer_code");
        let list = [...invoices.values()];
        if (customerCode) {
          list = list.filter(i => i.DebtorCode === customerCode);
        }
        return json({ invoices: list, total: list.length });
      }

      if (req.method === "POST") {
        const body = await req.json();
        const debtorCode = body.DebtorCode;
        const customer = customers.get(debtorCode);
        if (!customer) return json({ error: `Customer ${debtorCode} not found` }, 400);

        // Build line items
        const details: ACInvoiceDetail[] = (body.Details || []).map((d: any) => {
          const stock = stockItems.get(d.ItemCode);
          const unitPrice = d.UnitPrice ?? stock?.UnitPrice ?? 0;
          const qty = d.Qty || 0;
          return {
            ItemCode: d.ItemCode,
            Description: d.Description || stock?.Description || "",
            Qty: qty,
            UnitPrice: unitPrice,
            Amount: qty * unitPrice,
            UOM: d.UOM || stock?.BaseUOM || "pcs",
          };
        });

        const total = details.reduce((s, d) => s + d.Amount, 0);

        // Credit check
        const newOutstanding = customer.OutstandingBalance + total;
        if (newOutstanding > customer.CreditLimit && customer.CreditLimit > 0) {
          return json({
            error: "Credit limit exceeded",
            credit_limit: customer.CreditLimit,
            current_outstanding: customer.OutstandingBalance,
            invoice_total: total,
            would_be_outstanding: newOutstanding,
            shortfall: newOutstanding - customer.CreditLimit,
          }, 422);
        }

        const docNo = `INV-2026-${String(invoiceCounter++).padStart(4, "0")}`;
        const invoice: ACInvoice = {
          DocNo: docNo,
          DocDate: new Date().toISOString().split("T")[0],
          DebtorCode: debtorCode,
          CompanyName: customer.CompanyName,
          Details: details,
          Total: total,
          Outstanding: total,
          Status: "Draft",
        };
        invoices.set(docNo, invoice);

        // Update outstanding balance
        customer.OutstandingBalance = newOutstanding;

        // Deduct stock
        for (const d of details) {
          const stock = stockItems.get(d.ItemCode);
          if (stock) stock.QtyOnHand = Math.max(0, stock.QtyOnHand - d.Qty);
        }

        return json({ success: true, invoice });
      }
    }

    // ── PAYMENTS ────────────────────────────────────────────────────────
    if (resource === "payments") {
      if (req.method === "GET") {
        const customerCode = url.searchParams.get("customer_code");
        let list = payments;
        if (customerCode) {
          list = list.filter(p => p.DebtorCode === customerCode);
        }
        return json({ payments: list, total: list.length });
      }

      if (req.method === "POST") {
        const body = await req.json();
        const customer = customers.get(body.DebtorCode);
        if (!customer) return json({ error: "Customer not found" }, 400);

        const docNo = `PV-2026-${String(paymentCounter++).padStart(4, "0")}`;
        const payment: ACPayment = {
          DocNo: docNo,
          DocDate: new Date().toISOString().split("T")[0],
          DebtorCode: body.DebtorCode,
          Amount: body.Amount || 0,
          PaymentMethod: body.PaymentMethod || "Cash",
          Reference: body.Reference || "",
          InvoiceAllocations: body.InvoiceAllocations || [],
        };
        payments.push(payment);

        // Reduce outstanding
        customer.OutstandingBalance = Math.max(0, customer.OutstandingBalance - payment.Amount);

        // Reduce invoice outstanding if allocated
        for (const alloc of payment.InvoiceAllocations) {
          const inv = invoices.get(alloc.InvoiceNo);
          if (inv) inv.Outstanding = Math.max(0, inv.Outstanding - alloc.Amount);
        }

        return json({ success: true, payment });
      }
    }

    // ── CREDIT CHECK ────────────────────────────────────────────────────
    if (resource === "credit-check") {
      const customerCode = url.searchParams.get("customer_code");
      if (!customerCode) return json({ error: "customer_code required" }, 400);

      const customer = customers.get(customerCode);
      if (!customer) return json({ error: "Customer not found" }, 404);

      const available = Math.max(0, customer.CreditLimit - customer.OutstandingBalance);
      const utilizationPct = customer.CreditLimit > 0
        ? ((customer.OutstandingBalance / customer.CreditLimit) * 100)
        : 0;

      return json({
        AccNo: customer.AccNo,
        CompanyName: customer.CompanyName,
        CreditLimit: customer.CreditLimit,
        OutstandingBalance: customer.OutstandingBalance,
        AvailableCredit: available,
        UtilizationPercent: Math.round(utilizationPct * 100) / 100,
        CreditTerms: customer.CreditTerms,
        Status: available <= 0 ? "BLOCKED" : utilizationPct >= 80 ? "WARNING" : "OK",
        // Outstanding invoices for context
        OutstandingInvoices: [...invoices.values()]
          .filter(i => i.DebtorCode === customerCode && i.Outstanding > 0)
          .map(i => ({ DocNo: i.DocNo, DocDate: i.DocDate, Outstanding: i.Outstanding })),
      });
    }

    return json({ error: "Not found", available_endpoints: ["/customers", "/stock", "/invoices", "/payments", "/credit-check"] }, 404);

  } catch (err) {
    console.error("Mock Autocount error:", err);
    return json({ error: err.message || "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
