export type Sentiment = "positive" | "neutral" | "negative";
export type Intent = "Order Creation" | "Order Change" | "Stock Enquiry" | "Credit Enquiry" | "General Question";
export type Status = "New" | "AI Processed" | "Awaiting Review" | "Approved" | "Replied" | "Escalated" | "Awaiting Customer";

export interface ExtractedOrderItem {
  id: string;
  item_code: string;
  item_name: string;
  quantity: number;
  unit: string;
  delivery_date: string;
  delivery_address: string;
  remarks: string;
}

export interface RecommendedSKU {
  sku_code: string;
  name: string;
  category: string;
  color: string;
  size: string;
  price: number;
  stock_level: number;
  match_reason: string;
  image_url: string;
}

export interface Email {
  id: string;
  customer_name: string;
  email: string;
  subject: string;
  body: string;
  timestamp: string;
  sentiment: Sentiment;
  sentiment_confidence: number;
  intent: Intent;
  intent_confidence: number;
  extracted_order: ExtractedOrderItem[];
  recommended_skus: RecommendedSKU[];
  ai_reply_draft: string;
  status: Status;
  attachments?: string[];
}

export const mockEmails: Email[] = [
  {
    id: "em-001",
    customer_name: "Ahmad Razak",
    email: "ahmad.razak@globalsteel.com",
    subject: "Urgent Order: Green Industrial Hose 50m x 3 rolls",
    body: `Hi Team,

We need to place an urgent order for green industrial hoses for our factory expansion. Specifically:

- 3 rolls of 50m Green Industrial Hose (2-inch diameter)
- 2 rolls of 30m Blue PVC Pipe (1-inch)
- Delivery required by next Friday to our Johor Bahru warehouse

Also, could you include something similar to our last order of red safety cables? We need about 100m of those as well.

Please confirm stock availability and send us a quotation ASAP.

Best regards,
Ahmad Razak
Procurement Manager
Global Steel Industries Sdn Bhd`,
    timestamp: "2026-02-27T09:15:00Z",
    sentiment: "positive",
    sentiment_confidence: 87,
    intent: "Order Creation",
    intent_confidence: 94,
    extracted_order: [
      { id: "oi-1", item_code: "GIH-50-2", item_name: "Green Industrial Hose 50m (2-inch)", quantity: 3, unit: "rolls", delivery_date: "2026-03-06", delivery_address: "Johor Bahru Warehouse", remarks: "Urgent" },
      { id: "oi-2", item_code: "BPP-30-1", item_name: "Blue PVC Pipe 30m (1-inch)", quantity: 2, unit: "rolls", delivery_date: "2026-03-06", delivery_address: "Johor Bahru Warehouse", remarks: "" },
      { id: "oi-3", item_code: "RSC-100", item_name: "Red Safety Cable 100m", quantity: 1, unit: "rolls", delivery_date: "2026-03-06", delivery_address: "Johor Bahru Warehouse", remarks: "Similar to previous order" },
    ],
    recommended_skus: [
      { sku_code: "GIH-50-2A", name: "Premium Green Industrial Hose 50m", category: "Industrial Hose", color: "Green", size: "2-inch x 50m", price: 285.00, stock_level: 12, match_reason: "Matched: Green color + Industrial Hose category", image_url: "" },
      { sku_code: "GIH-50-2B", name: "Standard Green Rubber Hose 50m", category: "Industrial Hose", color: "Green", size: "2-inch x 50m", price: 195.00, stock_level: 25, match_reason: "Matched: Green color + Category = Industrial Hose", image_url: "" },
      { sku_code: "BPP-30-1A", name: "Blue PVC Pressure Pipe 30m", category: "PVC Pipe", color: "Blue", size: "1-inch x 30m", price: 78.50, stock_level: 40, match_reason: "Matched: Blue color + Pipe category", image_url: "" },
      { sku_code: "RSC-100X", name: "Red Safety Cable 100m Heavy Duty", category: "Safety Cable", color: "Red", size: "100m", price: 152.00, stock_level: 8, match_reason: "Matched: Similar to SKU RSC-100 from previous order", image_url: "" },
    ],
    ai_reply_draft: `Dear Ahmad,

Thank you for your order request. We're happy to assist with your factory expansion needs.

I've processed your order for the following items:
1. Green Industrial Hose 50m (2-inch) x 3 rolls — RM 285.00/roll
2. Blue PVC Pipe 30m (1-inch) x 2 rolls — RM 78.50/roll
3. Red Safety Cable 100m x 1 roll — RM 152.00/roll

All items are currently in stock. We can arrange delivery to your Johor Bahru warehouse by Friday, 6th March 2026.

Total estimated value: RM 1,164.00 (before GST)

Please confirm this order and we will prepare the official quotation.

Best regards,
Order Processing Team`,
    status: "AI Processed",
    attachments: ["purchase_spec.pdf"],
  },
  {
    id: "em-002",
    customer_name: "Sarah Chen",
    email: "sarah.chen@buildright.com",
    subject: "Change order #ORD-4521 - Replace blue pipes with red",
    body: `Hello,

Regarding our existing order #ORD-4521, we need to make a change. Please replace the blue PVC pipes with red ones of the same specification (1.5 inch, 20m lengths). We realized our safety compliance requires red-coded piping for that section.

Quantity remains the same at 10 units.

Can you also check if you have any green connectors that would fit these pipes?

Thanks,
Sarah Chen`,
    timestamp: "2026-02-27T08:30:00Z",
    sentiment: "neutral",
    sentiment_confidence: 72,
    intent: "Order Change",
    intent_confidence: 91,
    extracted_order: [
      { id: "oi-4", item_code: "RPP-20-1.5", item_name: "Red PVC Pipe 20m (1.5-inch)", quantity: 10, unit: "units", delivery_date: "2026-03-10", delivery_address: "BuildRight HQ, KL", remarks: "Replace blue pipes from ORD-4521" },
    ],
    recommended_skus: [
      { sku_code: "RPP-20-1.5A", name: "Red PVC Pressure Pipe 20m", category: "PVC Pipe", color: "Red", size: "1.5-inch x 20m", price: 95.00, stock_level: 18, match_reason: "Matched: Red color + Pipe category (replacement)", image_url: "" },
      { sku_code: "GCN-1.5", name: "Green Pipe Connector 1.5-inch", category: "Connector", color: "Green", size: "1.5-inch", price: 12.50, stock_level: 50, match_reason: "Matched: Green color + Connector for 1.5-inch pipe", image_url: "" },
    ],
    ai_reply_draft: `Dear Sarah,

Thank you for your update on order #ORD-4521.

We'll make the following change:
- Replace: Blue PVC Pipe 20m (1.5-inch) x 10 units
- With: Red PVC Pipe 20m (1.5-inch) x 10 units — RM 95.00/unit

We also have Green Pipe Connectors (1.5-inch) available at RM 12.50 each. Would you like to add these to the order?

Please confirm and we'll update the order accordingly.

Best regards,
Order Processing Team`,
    status: "Awaiting Review",
    attachments: [],
  },
  {
    id: "em-003",
    customer_name: "David Lim",
    email: "david.lim@megacorp.my",
    subject: "Stock check - Container fittings and industrial valves",
    body: `Hi,

We're planning a large project and need to check your stock levels for the following:

1. 20ft container door seals (any color)
2. Industrial ball valves - 3 inch
3. Heavy duty cable trays - 2m sections

We'd need approximately 50, 30, and 100 units respectively. Can you let me know availability and lead times?

Also, your last delivery was late by 3 days which caused issues on our end. Please ensure this doesn't happen again.

Regards,
David Lim`,
    timestamp: "2026-02-26T16:45:00Z",
    sentiment: "negative",
    sentiment_confidence: 78,
    intent: "Stock Enquiry",
    intent_confidence: 65,
    extracted_order: [],
    recommended_skus: [
      { sku_code: "CDS-20", name: "Container Door Seal 20ft", category: "Container Fitting", color: "Black", size: "20ft", price: 45.00, stock_level: 35, match_reason: "Matched: Category = Container Fitting", image_url: "" },
      { sku_code: "IBV-3", name: "Industrial Ball Valve 3-inch", category: "Industrial Valve", color: "Silver", size: "3-inch", price: 128.00, stock_level: 22, match_reason: "Matched: Category = Industrial Valve", image_url: "" },
      { sku_code: "HCT-2M", name: "Heavy Duty Cable Tray 2m", category: "Cable Tray", color: "Galvanized", size: "2m", price: 67.00, stock_level: 85, match_reason: "Matched: Category = Cable Tray", image_url: "" },
    ],
    ai_reply_draft: `Dear David,

Thank you for your enquiry. Here are the current stock levels for your requested items:

1. Container Door Seal 20ft — 35 units in stock (15 more arriving next week)
2. Industrial Ball Valve 3-inch — 22 units in stock (lead time: 2 weeks for remaining)
3. Heavy Duty Cable Tray 2m — 85 units in stock (15 more arriving this week)

We sincerely apologize for the delay on your previous delivery. We've flagged your account for priority processing to ensure timely delivery going forward.

Would you like us to prepare a quotation based on these quantities?

Best regards,
Order Processing Team`,
    status: "New",
    attachments: ["project_requirements.xlsx"],
  },
  {
    id: "em-004",
    customer_name: "Mei Ling Tan",
    email: "meiling@tangroup.com",
    subject: "Credit limit enquiry for upcoming bulk purchase",
    body: `Dear Team,

We are planning a significant bulk purchase next month estimated at around RM 250,000. Could you please confirm our current credit limit and outstanding balance?

We want to ensure we have sufficient credit before placing the order. If needed, we can arrange for an advance payment.

Thank you for your prompt attention.

Best regards,
Mei Ling Tan
Finance Director
Tan Group Holdings`,
    timestamp: "2026-02-26T14:20:00Z",
    sentiment: "positive",
    sentiment_confidence: 82,
    intent: "Credit Enquiry",
    intent_confidence: 96,
    extracted_order: [],
    recommended_skus: [],
    ai_reply_draft: `Dear Mei Ling,

Thank you for reaching out regarding your credit arrangements.

Your current account details:
- Credit Limit: RM 300,000
- Outstanding Balance: RM 45,200
- Available Credit: RM 254,800

Based on your estimated purchase of RM 250,000, your available credit should be sufficient. However, we recommend settling the outstanding balance before the new order to ensure smooth processing.

Please don't hesitate to contact us if you need any adjustments to your credit facility.

Best regards,
Credit Management Team`,
    status: "AI Processed",
    attachments: [],
  },
  {
    id: "em-005",
    customer_name: "Rajesh Kumar",
    email: "rajesh@kumarengineering.com",
    subject: "Re: General inquiry about product catalogue",
    body: `Hi there,

Do you have an updated product catalogue? We're a new customer and would like to explore your range of industrial supplies.

Specifically interested in:
- Safety equipment
- Industrial hoses
- Electrical cables

Could someone call me to discuss? My number is +60 12-345 6789.

Thanks,
Rajesh Kumar`,
    timestamp: "2026-02-25T11:00:00Z",
    sentiment: "positive",
    sentiment_confidence: 91,
    intent: "General Question",
    intent_confidence: 88,
    extracted_order: [],
    recommended_skus: [
      { sku_code: "CAT-2026", name: "Product Catalogue 2026", category: "Documentation", color: "N/A", size: "Digital", price: 0, stock_level: 999, match_reason: "Matched: General product enquiry", image_url: "" },
    ],
    ai_reply_draft: `Dear Rajesh,

Welcome! We'd be happy to assist you in exploring our product range.

I've attached our latest 2026 product catalogue which covers our full range of industrial supplies including safety equipment, industrial hoses, and electrical cables.

Our sales representative will contact you at +60 12-345 6789 within the next business day to discuss your requirements in detail.

In the meantime, feel free to browse our catalogue and let us know if any particular products catch your interest.

Best regards,
Sales Team`,
    status: "Awaiting Review",
    attachments: [],
  },
];
