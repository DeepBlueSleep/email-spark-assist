import { withAudit } from "../_shared/audit.ts";
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
  Discount?: string;
  Agent?: string;
  Address1?: string;
  Address2?: string;
  Address3?: string;
  Fax?: string;
  IsBoxx: boolean;
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
  ["A169", { AccNo: "A169", CompanyName: "A+A Carpenter Workshop", Contact: "Ah Shan", Phone1: "8180 9383", EmailAddress: "dcarpenter@singnet.com.sg", CreditLimit: 5000, CreditTerms: "30 days", OutstandingBalance: 0, IsActive: true, Discount: "15%", Agent: "EL", Address1: "280 Woodlands Ind. Park E5", Address2: "#05-03 Harvest @ Woodlands", Address3: "Singapore 757322", IsBoxx: false }],
  ["B092", { AccNo: "B092", CompanyName: "Bold Construction Pte Ltd", Contact: "Ferdinand Foong", Phone1: "6908 8956", EmailAddress: "", CreditLimit: 5000, CreditTerms: "30 days", OutstandingBalance: 0, IsActive: true, Discount: "20%", Agent: "AW", Address1: "68 Kaki Bukit Ave 6", Address2: "#02-13/14 Ark@KB", Address3: "Singapore 417896", IsBoxx: false }],
  ["I100", { AccNo: "I100", CompanyName: "Interior Times Design Pte Ltd", Contact: "Bryan Lim", Phone1: "9695 5566", EmailAddress: "finance.interiortimes@gmail.com", CreditLimit: 8000, CreditTerms: "30 days", OutstandingBalance: 0, IsActive: true, Discount: "30%", Agent: "RL", Address1: "3 Ang Mo Kio St 62", Address2: "#01-08 Link @ AMK", Address3: "Singapore 569139", IsBoxx: false }],
  ["I121", { AccNo: "I121", CompanyName: "Intheory Design Pte Ltd", Contact: "Ryan Linardy", Phone1: "9105 5968", EmailAddress: "", CreditLimit: 1500, CreditTerms: "30 days", OutstandingBalance: 0, IsActive: true, Discount: "12%", Agent: "WM", Address1: "114 Lavender Street", Address2: "#01-65 CT Hub 2", Address3: "Singapore 338729", IsBoxx: false }],
  ["M104", { AccNo: "M104", CompanyName: "Mix Suppliers & Enterprise", Contact: "Ah Yen", Phone1: "012-7007 069", EmailAddress: "tiongnamtrdg@gmail.com", CreditLimit: 90000, CreditTerms: "30 days", OutstandingBalance: 0, IsActive: true, Discount: "28%", Agent: "ML", Address1: "No. 38 Jalan Beladau 20", Address2: "Taman Putri Wangsa", Address3: "81800 Ulu Tiram", Fax: "07-361 2234", IsBoxx: false }],
  ["BOXX - A014", { AccNo: "BOXX - A014", CompanyName: "BOXX - AG 66 Home Design", Contact: "Henry", Phone1: "9022 8366", EmailAddress: "", CreditLimit: 2000, CreditTerms: "30 days", OutstandingBalance: 0, IsActive: true, Discount: "40%+25% (CN)", Agent: "JT", Address1: "Blk 108 Hougang Ave 1", Address2: "#01-1269", Address3: "Singapore 530108", IsBoxx: true }],
  ["BOXX - C010", { AccNo: "BOXX - C010", CompanyName: "BOXX - Ciseern By Designer Furnishings Pte Ltd", Contact: "Dean", Phone1: "6552 0078", EmailAddress: "", CreditLimit: 20000, CreditTerms: "30 days", OutstandingBalance: 0, IsActive: true, Discount: "45%+25% (CN)", Agent: "JT", Address1: "1 Tampines North Drive 1", Address2: "#01-37 T-Space", Address3: "Singapore 528559", Fax: "6552 8160", IsBoxx: true }],
  ["BOXX - D020", { AccNo: "BOXX - D020", CompanyName: "BOXX - D&I Design Interior Pte Ltd", Contact: "Darren", Phone1: "8838 4363", EmailAddress: "sale@dni.com.sg", CreditLimit: 3000, CreditTerms: "30 days", OutstandingBalance: 0, IsActive: true, Discount: "40%", Agent: "JT", Address1: "101 Woodlands Ave 12", Address2: "#02-18 Polaris@Woodlands", Address3: "Singapore 737719", IsBoxx: true }],
  ["BOXX - D032", { AccNo: "BOXX - D032", CompanyName: "BOXX - D&I Design Studio Pte Ltd", Contact: "Darren", Phone1: "8838 4363", EmailAddress: "", CreditLimit: 3000, CreditTerms: "30 days", OutstandingBalance: 0, IsActive: true, Discount: "40%", Agent: "JT", Address1: "101 Woodlands Ave 12", Address2: "#02-18 Polaris@Woodlands", Address3: "Singapore 737719", IsBoxx: true }],
  ["A192", { AccNo: "A192", CompanyName: "A1 Family Design Pte Ltd", Contact: "Simon", Phone1: "", EmailAddress: "", CreditLimit: 2000, CreditTerms: "C.O.D.", OutstandingBalance: 0, IsActive: true, Discount: "15%", Agent: "AW", Address1: "113 Eunos Ave 3", Address2: "#02-09", Address3: "Singapore 409838", IsBoxx: false }],
  ["A091", { AccNo: "A091", CompanyName: "AC Furnishing & Construction Pte Ltd", Contact: "Richard Lee", Phone1: "6366 5335", EmailAddress: "", CreditLimit: 3000, CreditTerms: "C.O.D.", OutstandingBalance: 0, IsActive: true, Discount: "10%", Agent: "JW2", Address1: "61 Woodlands Ind Pk E9", Address2: "#06-03 E9 Premium", Address3: "Singapore 757047", Fax: "6734 0596", IsBoxx: false }],
  ["BOXX - P006", { AccNo: "BOXX - P006", CompanyName: "BOXX - P & K Interior Decoration Pte Ltd", Contact: "K K Soh", Phone1: "6635 8080", EmailAddress: "", CreditLimit: 2000, CreditTerms: "C.O.D.", OutstandingBalance: 0, IsActive: true, Discount: "30%", Agent: "JT", Address1: "No 71 Woodland Ave 10", Address2: "#08-07 Woodlands Ind Xchange", Address3: "Singapore 737743", IsBoxx: true }],
  ["BOXX - P011", { AccNo: "BOXX - P011", CompanyName: "BOXX - Pomex Pte Ltd", Contact: "V Prasath", Phone1: "6747 1505", EmailAddress: "", CreditLimit: 1200, CreditTerms: "C.O.D.", OutstandingBalance: 0, IsActive: true, Discount: "25%", Agent: "JW", Address1: "No.1 Kaki Bukit Ave 3", Address2: "#10-23 KB-1", Address3: "Singapore 416087", Fax: "6481 3975", IsBoxx: true }],
  ["S238", { AccNo: "S238", CompanyName: "Supreme Houzz Design Studio Pte Ltd", Contact: "James", Phone1: "9092 7745", EmailAddress: "", CreditLimit: 0, CreditTerms: "F.O.C", OutstandingBalance: 0, IsActive: true, Agent: "ML", Address1: "62 Ubi Rd 1", Address2: "#03-14 Oxlay Bizhub One", Address3: "Singapore 408734", IsBoxx: false }],
  ["T118", { AccNo: "T118", CompanyName: "T&T Design Artisan Pte Ltd", Contact: "Desmond", Phone1: "", EmailAddress: "", CreditLimit: 0, CreditTerms: "F.O.C", OutstandingBalance: 0, IsActive: true, Agent: "WM", Address1: "No 21 Woodlands Close", Address2: "#01-28 Primz Bizhub", IsBoxx: false }],
  ["BOXX - S045", { AccNo: "BOXX - S045", CompanyName: "BOXX - Styleworkz Interior Pte Ltd", Contact: "Jason Low", Phone1: "8111 4815", EmailAddress: "", CreditLimit: 0, CreditTerms: "F.O.C", OutstandingBalance: 0, IsActive: true, Agent: "JT", Address1: "23A Tannery Lane", Address2: "Level 2", Address3: "Singapore 347785", IsBoxx: true }],
  ["BOXX - T005", { AccNo: "BOXX - T005", CompanyName: "BOXX - T&T Design Artisan Pte Ltd", Contact: "Desmond", Phone1: "9690 1208", EmailAddress: "", CreditLimit: 0, CreditTerms: "F.O.C", OutstandingBalance: 0, IsActive: true, Agent: "WM", Address1: "No 21 Woodlands Close", Address2: "#01-28 Primz Bizhub", Address3: "Singapore 737854", IsBoxx: true }],
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

Deno.serve(withAudit("mock-autocount", async (req) => {
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
          Discount: body.Discount,
          Agent: body.Agent,
          Address1: body.Address1,
          Address2: body.Address2,
          Address3: body.Address3,
          Fax: body.Fax,
          IsBoxx: accNo.startsWith("BOXX - "),
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

    // ── WORKFLOW ACTIONS (temporary stubs that "work") ─────────────────
    // Accepts approve-order / request-info / escalate from the dashboard.
    // Logs the payload and returns a deterministic acknowledgement so the UI
    // flow (toast + status update) completes end-to-end.
    if (resource === "workflow" && req.method === "POST") {
      const action = resourceId; // "approve-order" | "request-info" | "escalate"
      const allowed = new Set(["approve-order", "request-info", "escalate"]);
      if (!action || !allowed.has(action)) {
        return json({ error: "Unknown workflow action", allowed: [...allowed] }, 404);
      }

      const payload = await req.json().catch(() => ({}));
      const refPrefix =
        action === "approve-order" ? "SO" :
        action === "request-info" ? "INFO" : "ESC";
      const reference = `${refPrefix}-${Date.now().toString().slice(-8)}`;

      console.log(`[mock-autocount] workflow/${action}`, {
        reference,
        email_id: payload.email_id,
        customer: payload.customer_name,
        intent: payload.intent,
        order_total: payload.order_total,
      });

      return json({
        success: true,
        action,
        reference,
        received_at: new Date().toISOString(),
        echo: payload,
      });
    }

    return json({ error: "Not found", available_endpoints: ["/customers", "/stock", "/invoices", "/payments", "/credit-check", "/workflow/approve-order", "/workflow/request-info", "/workflow/escalate"] }, 404);

  } catch (err) {
    console.error("Mock Autocount error:", err);
    return json({ error: err.message || "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  }));
}
