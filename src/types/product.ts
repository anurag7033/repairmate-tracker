export type DiscountType = "amount" | "percentage";
export type ProductStatus = "active" | "inactive";

export interface Product {
  id: string;
  productCode: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  imageUrl: string | null;
  sellingPrice: number;
  discountType: DiscountType;
  discountValue: number;
  finalPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export const stockStatusOf = (p: Pick<Product, "stockQuantity" | "lowStockThreshold">): StockStatus => {
  if (p.stockQuantity <= 0) return "out_of_stock";
  if (p.stockQuantity <= p.lowStockThreshold) return "low_stock";
  return "in_stock";
};

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};
