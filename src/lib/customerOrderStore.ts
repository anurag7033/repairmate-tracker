import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = "cod" | "online";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface CustomerOrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productCode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface CustomerOrder {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
  voucherId: string | null;
  voucherCode: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: CustomerOrderItem[];
}

const mapOrder = (row: any): CustomerOrder => ({
  id: row.id,
  orderId: row.order_id,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  customerEmail: row.customer_email,
  deliveryAddress: row.delivery_address,
  paymentMethod: row.payment_method,
  paymentStatus: row.payment_status,
  orderStatus: row.order_status,
  subtotal: Number(row.subtotal),
  discountAmount: Number(row.discount_amount),
  grandTotal: Number(row.grand_total),
  voucherId: row.voucher_id,
  voucherCode: row.voucher_code,
  adminNotes: row.admin_notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  items: row.customer_order_items?.map(mapItem),
});

const mapItem = (row: any): CustomerOrderItem => ({
  id: row.id,
  orderId: row.order_id,
  productId: row.product_id,
  productCode: row.product_code,
  productName: row.product_name,
  unitPrice: Number(row.unit_price),
  quantity: Number(row.quantity),
  lineTotal: Number(row.line_total),
});

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
  voucherId?: string | null;
  voucherCode?: string | null;
  discountAmount?: number;
  items: Array<{
    productId: string | null;
    productCode: string;
    productName: string;
    unitPrice: number;
    quantity: number;
  }>;
}

export const createCustomerOrder = async (input: CreateOrderInput): Promise<CustomerOrder> => {
  const itemsPayload = input.items.map((i) => ({
    product_id: i.productId,
    product_code: i.productCode,
    product_name: i.productName,
    unit_price: i.unitPrice,
    quantity: i.quantity,
  }));

  const { data, error } = await supabase.rpc("place_customer_order_public" as any, {
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_customer_email: input.customerEmail || null,
    p_delivery_address: input.deliveryAddress,
    p_payment_method: input.paymentMethod,
    p_items: itemsPayload as any,
    p_voucher_id: input.paymentMethod === "online" ? input.voucherId || null : null,
    p_voucher_code: input.paymentMethod === "online" ? input.voucherCode || null : null,
    p_discount_amount: input.paymentMethod === "online" ? input.discountAmount || 0 : 0,
  });

  if (error) throw error;
  return mapOrder(data as any);
};

export const getAllCustomerOrders = async (): Promise<CustomerOrder[]> => {
  const { data, error } = await supabase
    .from("customer_orders")
    .select("*, customer_order_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapOrder);
};

export const getCustomerOrderByOrderId = async (orderId: string): Promise<CustomerOrder | null> => {
  const { data, error } = await supabase.rpc("get_customer_order_public" as any, { p_order_id: orderId });
  if (error) throw error;
  if (!data) return null;
  return mapOrder(data as any);
};

export const updateOrderStatus = async (id: string, status: OrderStatus) => {
  const { error } = await supabase
    .from("customer_orders")
    .update({ order_status: status })
    .eq("id", id);
  if (error) throw error;
};

export const updatePaymentStatus = async (id: string, status: PaymentStatus) => {
  const { error } = await supabase
    .from("customer_orders")
    .update({ payment_status: status })
    .eq("id", id);
  if (error) throw error;
};

export const applyVoucherToOrder = async (
  code: string,
  subtotal: number,
  phone: string
): Promise<{ voucherId: string; voucherCode: string; discountAmount: number }> => {
  const { data, error } = await supabase.rpc("apply_voucher_to_customer_order", {
    p_voucher_code: code,
    p_subtotal: subtotal,
    p_phone: phone,
  });
  if (error) throw error;
  const d = data as any;
  return {
    voucherId: d.voucher_id,
    voucherCode: d.voucher_code,
    discountAmount: Number(d.discount_amount),
  };
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  accepted: "Accepted",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  "placed",
  "accepted",
  "preparing",
  "out_for_delivery",
  "delivered",
];
