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
