export type Sentiment = "positive" | "neutral" | "negative";
export type Intent = "Order Creation" | "Order Change" | "Stock Enquiry" | "Credit Enquiry" | "General Question" | string;
export type Status = "New" | "AI Processed" | "Awaiting Review" | "Approved" | "Replied" | "Escalated" | "Awaiting Customer" | "Stock In Process" | string;

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

export interface AttachmentMeta {
  id: string;
  email_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  credit_limit?: number;
  credit_terms?: string;
  credit_used?: number;
  code?: string;
  address_1?: string;
  address_2?: string;
  address_3?: string;
  fax?: string;
  attention?: string;
  discount?: string;
  agent?: string;
  delivery_address_1?: string;
  delivery_address_2?: string;
  delivery_address_3?: string;
  delivery_address_4?: string;
  is_boxx?: boolean;
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
  attachmentsMeta?: AttachmentMeta[];
  customer_id?: string;
  customer?: Customer;
  is_relevant?: boolean;
  relevance_reason?: string;
  is_archived?: boolean;
}

// All email data is loaded from NeonDB via the api-emails edge function.
// This array is the initial state placeholder before live data arrives.
export const mockEmails: Email[] = [];

