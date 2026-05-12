import { supabase } from "@/integrations/supabase/client";
import { RepairOrder, STATUS_LABELS } from "@/types/repair";

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
  // Use SECURITY DEFINER RPC so unauthenticated customers can read only safe fields
  const { data, error } = await supabase.rpc("get_repair_by_tracking", {
    p_tracking_id: trackingId,
  } as any);
  if (error) throw error;
  const row = Array.isArray(data) ? (data as any[])[0] : data;
  if (!row) return null;
  // RPC does not return customer_phone or imei_number — fill with safe placeholders
  return mapFromDb({ ...row, customer_phone: "", imei_number: "" });
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

export const GOOGLE_REVIEW_URL = "https://g.page/r/CT9t1ZhIhIlUEAE/review";

export async function markReceivedPublic(trackingId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_received_public", {
    p_tracking_id: trackingId,
  } as any);
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, ""));
}

export function buildStatusWhatsAppMessage(order: RepairOrder): string {
  const balanceDue = Math.max(0, order.quotation - order.advancePaid - order.discountAmount);
  const trackUrl = `${window.location.origin}/track/${order.trackingId}`;
  const device = `${order.mobileBrand} ${order.mobileModel}`;
  const header = `Hello ${order.customerName},`;
  const footer = `\n\n🔗 Track: ${trackUrl}\n\n— Anurag Mobile Repairing Centre`;

  switch (order.status) {
    case "received":
      return `${header}\n\n📥 We've received your *${device}* at our service centre.\n🔖 Tracking ID: *${order.trackingId}*\nOur technician will begin diagnosis shortly.${footer}`;
    case "diagnosing":
      return `${header}\n\n🔍 Our technician is *diagnosing* your *${device}*.\n🔖 Tracking ID: *${order.trackingId}*\nWe'll share an estimate once the issue is confirmed.${footer}`;
    case "waiting_for_parts":
      return `${header}\n\n⏳ Your *${device}* repair is on hold — *waiting for parts* to arrive.\n🔖 Tracking ID: *${order.trackingId}*\nWe'll resume the repair as soon as they're in stock.${footer}`;
    case "repairing":
      return `${header}\n\n🛠️ Good news — your *${device}* is *under repair* right now.\n🔖 Tracking ID: *${order.trackingId}*\nWe'll update you once it's ready for testing.${footer}`;
    case "testing":
      return `${header}\n\n🧪 Your *${device}* repair is done and currently in *quality testing*.\n🔖 Tracking ID: *${order.trackingId}*\nWe'll notify you as soon as it's ready for pickup.${footer}`;
    case "completed": {
      const payLine = balanceDue > 0
        ? `\n💳 Balance Due: *₹${balanceDue}*${order.paymentLink ? `\n🔗 Pay: ${order.paymentLink}` : ""}`
        : `\n✅ Payment: Fully Paid`;
      return `${header}\n\n✅ Your *${device}* repair is *completed* and ready for pickup!\n🔖 Tracking ID: *${order.trackingId}*\n💰 Total: ₹${order.quotation}${order.discountAmount > 0 ? `\n🎟️ Discount: -₹${order.discountAmount}` : ""}${payLine}${footer}`;
    }
    case "delivered":
      return `${header}\n\n🎉 Thank you for collecting your *${device}*!\n🔖 Tracking ID: *${order.trackingId}*\nWe hope you're satisfied with our service. We'd love a quick Google review:\n⭐ ${GOOGLE_REVIEW_URL}${footer}`;
    case "returned":
      return `${header}\n\n↩️ Your *${device}* has been *returned* as discussed.\n🔖 Tracking ID: *${order.trackingId}*\nNo invoice will be generated. Please contact us if you have any questions.${footer}`;
    default:
      return `${header}\n\nUpdate on your *${device}* (Tracking *${order.trackingId}*): ${STATUS_LABELS[order.status]}.${footer}`;
  }
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
  _currentCustomerPhone: string
): Promise<{ trackingId: string; discountAmount: number }> {
  const { data, error } = await supabase.rpc("apply_voucher_public", {
    p_voucher_code: voucherCode,
    p_tracking_id: currentTrackingId,
  } as any);
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, ""));
  const result = data as any;
  return {
    trackingId: result?.tracking_id || currentTrackingId,
    discountAmount: Number(result?.discount_amount || 0),
  };
}

export async function removeAppliedVoucher(trackingId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_voucher_public", {
    p_tracking_id: trackingId,
  } as any);
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, ""));
}
