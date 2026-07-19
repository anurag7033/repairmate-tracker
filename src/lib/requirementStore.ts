import { supabase } from "@/integrations/supabase/client";

export type RequirementStatus = "pending" | "confirmed" | "fulfilled" | "cancelled";

export interface CustomerRequirement {
  id: string;
  requirement_id: string;
  customer_name: string;
  customer_phone: string;
  items: string[];
  notes: string | null;
  status: RequirementStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(r: any): CustomerRequirement {
  return {
    ...r,
    requirement_id: r.requirement_id ?? "",
    items: Array.isArray(r.items) ? r.items : [],
  };
}

export async function submitRequirement(input: {
  customer_name: string;
  customer_phone: string;
  items: string[];
  notes?: string;
}): Promise<CustomerRequirement> {
  const { data, error } = await supabase
    .from("customer_requirements" as any)
    .insert({
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      items: input.items,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function listRequirements(): Promise<CustomerRequirement[]> {
  const { data, error } = await supabase
    .from("customer_requirements" as any)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getRequirementByCode(code: string): Promise<CustomerRequirement | null> {
  const c = code.trim();
  if (!c) return null;
  const { data, error } = await supabase.rpc("get_requirement_by_code" as any, { p_code: c });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapRow(row) : null;
}

export async function updateRequirementStatus(id: string, status: RequirementStatus, admin_notes?: string) {
  const patch: any = { status };
  if (admin_notes !== undefined) patch.admin_notes = admin_notes;
  const { error } = await supabase.from("customer_requirements" as any).update(patch).eq("id", id);
  if (error) throw error;
}

export async function markRequirementFulfilled(id: string) {
  const { error } = await supabase.from("customer_requirements" as any).update({ status: "fulfilled" }).eq("id", id);
  if (error) throw error;
}

export async function deleteRequirement(id: string) {
  const { error } = await supabase.from("customer_requirements" as any).delete().eq("id", id);
  if (error) throw error;
}
