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

export async function applyVoucher(voucherCode: string): Promise<{ trackingId: string; discountAmount: number }> {
  const { data: voucher, error: fetchErr } = await supabase
    .from("vouchers")
    .select("*")
    .eq("voucher_code", voucherCode)
    .eq("is_used", false)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!voucher) throw new Error("Invalid or already used voucher code");

  // Mark voucher as used
  const { error: updateVoucherErr } = await supabase
    .from("vouchers")
    .update({ is_used: true })
    .eq("id", voucher.id);
  if (updateVoucherErr) throw updateVoucherErr;

  // Update discount on repair order
  const { data: order, error: orderErr } = await supabase
    .from("repair_orders")
    .select("discount_amount")
    .eq("tracking_id", voucher.tracking_id)
    .single();
  if (orderErr) throw orderErr;

  const newDiscount = Number(order.discount_amount || 0) + Number(voucher.discount_amount);
  const { error: updateErr } = await supabase
    .from("repair_orders")
    .update({ discount_amount: newDiscount })
    .eq("tracking_id", voucher.tracking_id);
  if (updateErr) throw updateErr;

  return { trackingId: voucher.tracking_id, discountAmount: voucher.discount_amount };
}
