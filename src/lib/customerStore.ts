import { supabase } from "@/integrations/supabase/client";
import { Customer, CustomerWithStats } from "@/types/customer";
import { RepairOrder } from "@/types/repair";

function mapCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name || "",
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCustomerStats(row: any): CustomerWithStats {
  return {
    ...mapCustomer(row),
    totalRepairs: Number(row.total_repairs || 0),
    pendingRepairs: Number(row.pending_repairs || 0),
    lastVisit: row.last_visit || null,
    totalSpent: Number(row.total_spent || 0),
  };
}

export function normalizePhone(p: string): string {
  return (p || "").replace(/\D/g, "").slice(-10);
}

export async function getCustomersWithStats(): Promise<CustomerWithStats[]> {
  const { data, error } = await supabase.rpc("get_customers_with_stats" as any);
  if (error) throw error;
  return ((data as any[]) || []).map(mapCustomerStats);
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const { data, error } = await supabase.from("customers" as any).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapCustomer(data) : null;
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const q = query.trim();
  if (!q) {
    const { data, error } = await supabase
      .from("customers" as any)
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return ((data as any[]) || []).map(mapCustomer);
  }
  const norm = normalizePhone(q);
  const { data, error } = await supabase
    .from("customers" as any)
    .select("*")
    .or(`name.ilike.%${q}%,phone.ilike.%${q}%${norm ? `,phone_normalized.ilike.%${norm}%` : ""}`)
    .limit(10);
  if (error) throw error;
  return ((data as any[]) || []).map(mapCustomer);
}

export async function createCustomer(input: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}): Promise<Customer> {
  const norm = normalizePhone(input.phone);
  if (!norm) throw new Error("Valid phone number is required");
  // Try find existing first
  const { data: existing } = await supabase
    .from("customers" as any)
    .select("*")
    .eq("phone_normalized", norm)
    .maybeSingle();
  if (existing) {
    // Update missing fields opportunistically
    const updates: any = {};
    if (input.name && !(existing as any).name) updates.name = input.name;
    if (input.email && !(existing as any).email) updates.email = input.email;
    if (input.address && !(existing as any).address) updates.address = input.address;
    if (Object.keys(updates).length) {
      await supabase.from("customers" as any).update(updates).eq("id", (existing as any).id);
    }
    return mapCustomer({ ...(existing as any), ...updates });
  }
  const { data, error } = await supabase
    .from("customers" as any)
    .insert({
      name: input.name,
      phone: input.phone,
      phone_normalized: norm,
      email: input.email || "",
      address: input.address || "",
      notes: input.notes || "",
    })
    .select()
    .single();
  if (error) throw error;
  return mapCustomer(data);
}

export async function updateCustomer(id: string, patch: Partial<Customer>): Promise<void> {
  const updates: any = {};
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.phone !== undefined) {
    updates.phone = patch.phone;
    updates.phone_normalized = normalizePhone(patch.phone);
  }
  if (patch.email !== undefined) updates.email = patch.email;
  if (patch.address !== undefined) updates.address = patch.address;
  if (patch.notes !== undefined) updates.notes = patch.notes;
  const { error } = await supabase.from("customers" as any).update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from("customers" as any).delete().eq("id", id);
  if (error) throw error;
}

export async function getRepairsByCustomerId(customerId: string): Promise<RepairOrder[]> {
  const { data, error } = await supabase
    .from("repair_orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
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
    adminDiscount: Number(row.admin_discount || 0),
    pendingPaymentReceived: Number(row.pending_payment_received || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
