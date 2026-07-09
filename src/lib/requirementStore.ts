import { supabase } from "@/integrations/supabase/client";

export type RequirementStatus = "pending" | "confirmed" | "fulfilled" | "cancelled";

export interface CustomerRequirement {
  id: string;
  customer_name: string;
  customer_phone: string;
  items: string[];
  notes: string | null;
  status: RequirementStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function submitRequirement(input: {
  customer_name: string;
  customer_phone: string;
  items: string[];
  notes?: string;
}) {
  const { data, error } = await supabase
    .from("customer_requirements")
    .insert({
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      items: input.items,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listRequirements(): Promise<CustomerRequirement[]> {
  const { data, error } = await supabase
    .from("customer_requirements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    items: Array.isArray(r.items) ? r.items : [],
  }));
}

export async function updateRequirementStatus(id: string, status: RequirementStatus, admin_notes?: string) {
  const patch: any = { status };
  if (admin_notes !== undefined) patch.admin_notes = admin_notes;
  const { error } = await supabase.from("customer_requirements").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteRequirement(id: string) {
  const { error } = await supabase.from("customer_requirements").delete().eq("id", id);
  if (error) throw error;
}
