export interface SalesReturnItem {
  id?: string;
  returnId?: string;
  invoiceItemId: string | null;
  productId: string | null;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  restock: boolean;
  createdAt?: string;
}

export interface SalesReturn {
  id: string;
  invoiceId: string;
  refundAmount: number;
  refundMethod: string | null;
  reason: string | null;
  restock: boolean;
  createdBy: string | null;
  createdAt: string;
  items?: SalesReturnItem[];
}
