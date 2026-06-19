import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/product";

type Row = {
  id: string;
  product_code: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  image_url: string | null;
  selling_price: number;
  discount_type: string;
  discount_value: number;
  final_price: number;
  purchase_price?: number;
  stock_quantity: number;
  low_stock_threshold: number;
  status: string;
  created_at: string;
  updated_at: string;
};

const mapRow = (r: Row): Product => ({
  id: r.id,
  productCode: r.product_code,
  name: r.name,
  category: r.category ?? "",
  brand: r.brand ?? "",
  description: r.description ?? "",
  imageUrl: r.image_url,
  sellingPrice: Number(r.selling_price) || 0,
  purchasePrice: Number(r.purchase_price) || 0,
  discountType: (r.discount_type as Product["discountType"]) || "amount",
  discountValue: Number(r.discount_value) || 0,
  finalPrice: Number(r.final_price) || 0,
  stockQuantity: Number(r.stock_quantity) || 0,
  lowStockThreshold: Number(r.low_stock_threshold) || 0,
  status: (r.status as Product["status"]) || "active",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(mapRow);
}

export interface ProductInput {
  productCode: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  imageUrl: string | null;
  sellingPrice: number;
  purchasePrice: number;
  discountType: "amount" | "percentage";
  discountValue: number;
  stockQuantity: number;
  lowStockThreshold: number;
  status: "active" | "inactive";
}

const toRow = (p: ProductInput) => ({
  product_code: p.productCode.trim(),
  name: p.name.trim(),
  category: p.category.trim(),
  brand: p.brand.trim(),
  description: p.description,
  image_url: p.imageUrl,
  selling_price: p.sellingPrice,
  purchase_price: p.purchasePrice || 0,
  discount_type: p.discountType,
  discount_value: p.discountValue,
  stock_quantity: p.stockQuantity,
  low_stock_threshold: p.lowStockThreshold,
  status: p.status,
});


export async function addProduct(p: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert(toRow(p))
    .select("*")
    .single();
  if (error) {
    if ((error as any).code === "23505") {
      throw new Error(`Product code "${p.productCode}" already exists.`);
    }
    throw error;
  }
  return mapRow(data as Row);
}

export async function updateProduct(id: string, p: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .update(toRow(p))
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    if ((error as any).code === "23505") {
      throw new Error(`Product code "${p.productCode}" already exists.`);
    }
    throw error;
  }
  return mapRow(data as Row);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadProductImage(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Image exceeds 5MB");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("booking-images").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("booking-images").getPublicUrl(path);
  return data.publicUrl;
}

/** Look up products by their product codes in a single round-trip. */
export async function getProductsByCodes(
  codes: string[]
): Promise<Map<string, { id: string; stockQuantity: number; name: string; productCode: string }>> {
  const unique = Array.from(new Set(codes.map((c) => c.trim()).filter(Boolean)));
  const out = new Map<string, { id: string; stockQuantity: number; name: string; productCode: string }>();
  if (unique.length === 0) return out;
  const CHUNK = 200;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("products")
      .select("id, product_code, stock_quantity, name")
      .in("product_code", slice);
    if (error) throw error;
    for (const r of data as any[]) {
      out.set(String(r.product_code).toUpperCase(), {
        id: r.id,
        stockQuantity: Number(r.stock_quantity) || 0,
        name: r.name,
        productCode: r.product_code,
      });
    }
  }
  return out;
}

/** Apply absolute stock_quantity values in batched parallel updates. */
export async function bulkSetStock(
  updates: Array<{ id: string; stockQuantity: number }>
): Promise<number> {
  if (updates.length === 0) return 0;
  const CONCURRENCY = 8;
  let done = 0;
  for (let i = 0; i < updates.length; i += CONCURRENCY) {
    const batch = updates.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (u) => {
        const { error } = await supabase
          .from("products")
          .update({ stock_quantity: Math.max(0, Math.floor(u.stockQuantity)) })
          .eq("id", u.id);
        if (error) throw error;
        done++;
      })
    );
  }
  return done;
}
