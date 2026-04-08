import { supabase } from "@/integrations/supabase/client";
import { RepairOrder } from "@/types/repair";

// Map DB snake_case to frontend camelCase
function mapFromDb(row: any): RepairOrder {
  return {
    id: row.id,
    trackingId: row.tracking_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    mobileBrand: row.mobile_brand,
    mobileModel: row.mobile_model,
    imeiNumber: row.imei_number || "",
    issueDescription: row.issue_description || "",
    repairDetails: row.repair_details || "",
    status: row.status,
    quotation: Number(row.quotation),
    advancePaid: Number(row.advance_paid || 0),
    paymentStatus: row.payment_status,
    paymentLink: row.payment_link || "",
    discountAmount: Number(row.discount_amount || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getOrders(): Promise<RepairOrder[]> {
  const { data, error } = await supabase
    .from("repair_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapFromDb);
}

export async function addOrder(order: Omit<RepairOrder, "id" | "createdAt" | "updatedAt">): Promise<RepairOrder> {
  const { data, error } = await supabase
    .from("repair_orders")
    .insert({
      tracking_id: order.trackingId,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      mobile_brand: order.mobileBrand,
      mobile_model: order.mobileModel,
      imei_number: order.imeiNumber,
      issue_description: order.issueDescription,
      repair_details: order.repairDetails,
      status: order.status,
      quotation: order.quotation,
      advance_paid: order.advancePaid,
      payment_status: order.paymentStatus,
      payment_link: order.paymentLink,
    })
    .select()
    .single();
  if (error) throw error;
  return mapFromDb(data);
}

export async function updateOrder(order: RepairOrder): Promise<void> {
  const { error } = await supabase
    .from("repair_orders")
    .update({
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      mobile_brand: order.mobileBrand,
      mobile_model: order.mobileModel,
      imei_number: order.imeiNumber,
      issue_description: order.issueDescription,
      repair_details: order.repairDetails,
      status: order.status,
      quotation: order.quotation,
      advance_paid: order.advancePaid,
      payment_status: order.paymentStatus,
      payment_link: order.paymentLink,
    })
    .eq("id", order.id);
  if (error) throw error;
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase
    .from("repair_orders")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function findByTrackingId(trackingId: string): Promise<RepairOrder | null> {
  const { data, error } = await supabase
    .from("repair_orders")
    .select("*")
    .ilike("tracking_id", trackingId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapFromDb(data) : null;
}

export function generateTrackingId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "MR-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

// Voucher functions
export function generateVoucherCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "DISC-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createVoucher(trackingId: string, discountAmount: number): Promise<{ voucher_code: string }> {
  const code = generateVoucherCode();
  const { data, error } = await supabase
    .from("vouchers")
    .insert({ tracking_id: trackingId, voucher_code: code, discount_amount: discountAmount })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getVouchersForOrder(trackingId: string) {
  const { data, error } = await supabase
    .from("vouchers")
    .select("*")
    .eq("tracking_id", trackingId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getActivePublicVouchers() {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("vouchers")
    .select("*")
    .eq("voucher_type", "public" as any)
    .eq("status", "active" as any)
    .order("created_at", { ascending: false });
  if (error) throw error;
  // Filter client-side for expiry and usage
  return (data || []).filter((v: any) => {
    if (v.expiry_date && v.expiry_date < today) return false;
    if (v.usage_limit > 0 && v.used_count >= v.usage_limit) return false;
    return true;
  });
}

export async function applyVoucher(
  voucherCode: string,
  currentTrackingId: string,
  currentCustomerPhone: string
): Promise<{ trackingId: string; discountAmount: number }> {
  const { data: voucher, error: fetchErr } = await supabase
    .from("vouchers")
    .select("*")
    .eq("voucher_code", voucherCode)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!voucher) throw new Error("Invalid voucher code");

  const v = voucher as any;

  // Check status
  if (v.status !== "active") throw new Error("This voucher is no longer active.");

  // Check expiry
  if (v.expiry_date && new Date(v.expiry_date) < new Date()) {
    throw new Error("This voucher has expired.");
  }

  // Check usage limit
  if (v.usage_limit > 0 && v.used_count >= v.usage_limit) {
    throw new Error("This voucher has reached its usage limit.");
  }

  // For private vouchers: check same customer phone
  if (v.voucher_type === "private") {
    if (v.tracking_id === currentTrackingId) {
      throw new Error("This voucher can only be used on your next repair, not the current one.");
    }
    if (v.tracking_id) {
      const { data: voucherOrder, error: voucherOrderErr } = await supabase
        .from("repair_orders")
        .select("customer_phone")
        .eq("tracking_id", v.tracking_id)
        .single();
      if (voucherOrderErr) throw voucherOrderErr;
      const cleanCurrent = currentCustomerPhone.replace(/\D/g, "");
      const cleanVoucher = (voucherOrder.customer_phone || "").replace(/\D/g, "");
      if (cleanCurrent !== cleanVoucher) {
        throw new Error("This voucher is not valid for your account.");
      }
    }
  }

  // Check duplicate redemption on same order
  const { data: existingRedemption } = await supabase
    .from("voucher_redemptions")
    .select("id")
    .eq("voucher_id", v.id)
    .eq("order_tracking_id", currentTrackingId)
    .maybeSingle();
  if (existingRedemption) {
    throw new Error("This voucher has already been applied to this order.");
  }

  // Get current order for amount checks
  const { data: currentOrder, error: currentOrderErr } = await supabase
    .from("repair_orders")
    .select("quotation, discount_amount, customer_name, customer_phone")
    .eq("tracking_id", currentTrackingId)
    .single();
  if (currentOrderErr) throw currentOrderErr;

  const orderAmount = Number(currentOrder.quotation);

  // Check min/max conditions
  if (v.min_order_amount > 0 && orderAmount < v.min_order_amount) {
    throw new Error(`Minimum order amount is ₹${v.min_order_amount}.`);
  }
  if (v.max_order_amount > 0 && orderAmount > v.max_order_amount) {
    throw new Error(`This voucher is valid for orders up to ₹${v.max_order_amount}.`);
  }

  // Calculate discount
  let discountValue = 0;
  if (v.discount_type === "percentage") {
    discountValue = Math.round((orderAmount * v.discount_percentage) / 100);
  } else {
    discountValue = Number(v.discount_amount);
  }

  const newDiscount = Number(currentOrder.discount_amount || 0) + discountValue;
  const finalAmount = orderAmount - newDiscount;

  // Log redemption
  await supabase.from("voucher_redemptions").insert({
    voucher_id: v.id,
    order_tracking_id: currentTrackingId,
    customer_name: currentOrder.customer_name,
    customer_phone: currentOrder.customer_phone,
    amount_before: orderAmount,
    discount_applied: discountValue,
    final_amount: Math.max(0, finalAmount),
  } as any);

  // Update voucher used_count
  const newUsedCount = (v.used_count || 0) + 1;
  const newStatus = v.usage_limit > 0 && newUsedCount >= v.usage_limit ? "exhausted" : "active";
  await supabase
    .from("vouchers")
    .update({
      used_count: newUsedCount,
      status: newStatus,
      is_used: v.voucher_type === "private" ? true : v.is_used,
    } as any)
    .eq("id", v.id);

  // Update discount on current repair order
  await supabase
    .from("repair_orders")
    .update({ discount_amount: newDiscount })
    .eq("tracking_id", currentTrackingId);

  return { trackingId: currentTrackingId, discountAmount: discountValue };
}
