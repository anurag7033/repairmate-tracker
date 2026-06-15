export type SalesPaymentMethod = "cash" | "upi" | "card" | "bank_transfer" | "mixed";
export type SalesPaymentStatus = "paid" | "partial" | "pending";

export interface SalesInvoiceItem {
  id?: string;
  invoiceId?: string;
  productId: string | null;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  purchasePrice: number;
  profitPerUnit: number;
  totalProfit: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerAltPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerGst: string;
  subtotal: number;
  productDiscountTotal: number;
  invoiceDiscount: number;
  gstPercent: number;
  gstAmount: number;
  grandTotal: number;
  amountReceived: number;
  changeReturned: number;
  remainingAmount: number;
  totalPurchaseCost: number;
  totalProfit: number;
  paymentMethod: SalesPaymentMethod;
  paymentStatus: SalesPaymentStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  items?: SalesInvoiceItem[];
}

export const PAYMENT_METHOD_LABELS: Record<SalesPaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank Transfer",
  mixed: "Mixed",
};
