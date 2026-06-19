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


export type ImportMode = "add" | "update" | "merge";

export interface ImportRowInput {
  productCode: string;
  name?: string;
  category?: string;
  brand?: string;
  description?: string;
  imageUrl?: string | null;
  sellingPrice?: number;
  purchasePrice?: number;
  discountType?: "amount" | "percentage";
  discountValue?: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
  status?: "active" | "inactive";
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ productCode: string; error: string }>;
}

const toInsertRow = (r: ImportRowInput) => ({
  product_code: r.productCode.trim(),
  name: (r.name || "").trim(),
  category: (r.category || "").trim(),
  brand: (r.brand || "").trim(),
  description: r.description || "",
  image_url: r.imageUrl ?? null,
  selling_price: Number(r.sellingPrice) || 0,
  purchase_price: Number(r.purchasePrice) || 0,
  discount_type: r.discountType || "amount",
  discount_value: Number(r.discountValue) || 0,
  stock_quantity: Math.max(0, Math.floor(Number(r.stockQuantity) || 0)),
  low_stock_threshold: Math.max(0, Math.floor(Number(r.lowStockThreshold) || 0)),
  status: r.status || "active",
});

const toUpdateRow = (r: ImportRowInput, existing: Row, mode: "update" | "merge") => {
  const row: Record<string, any> = {};
  const setIf = (key: string, value: any, fallback: any) => {
    if (value !== undefined && value !== null && value !== "") row[key] = value;
    else if (mode === "update") row[key] = fallback;
  };
  setIf("name", r.name?.trim(), existing.name);
  setIf("category", r.category?.trim(), existing.category);
  setIf("brand", r.brand?.trim(), existing.brand);
  setIf("description", r.description, existing.description);
  setIf("image_url", r.imageUrl, existing.image_url);
  if (r.sellingPrice !== undefined) row.selling_price = Number(r.sellingPrice) || 0;
  if (r.purchasePrice !== undefined) row.purchase_price = Number(r.purchasePrice) || 0;
  if (r.discountType !== undefined) row.discount_type = r.discountType;
  if (r.discountValue !== undefined) row.discount_value = Number(r.discountValue) || 0;
  if (r.lowStockThreshold !== undefined) row.low_stock_threshold = Math.floor(Number(r.lowStockThreshold) || 0);
  if (r.status !== undefined) row.status = r.status;

  if (mode === "merge") {
    if (r.stockQuantity !== undefined) {
      row.stock_quantity = Math.max(0, (Number(existing.stock_quantity) || 0) + Math.floor(Number(r.stockQuantity) || 0));
    }
  } else {
    if (r.stockQuantity !== undefined) {
      row.stock_quantity = Math.max(0, Math.floor(Number(r.stockQuantity) || 0));
    }
  }
  return row;
};

/** Bulk import rows with mode: add (insert only), update (overwrite fields), merge (sum stock + fill fields). */
export async function bulkImportProducts(
  rows: ImportRowInput[],
  mode: ImportMode
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
  if (rows.length === 0) return result;

  // Pre-fetch existing by code
  const codes = rows.map((r) => r.productCode.trim()).filter(Boolean);
  const existingMap = new Map<string, Row>();
  const CHUNK = 200;
  for (let i = 0; i < codes.length; i += CHUNK) {
    const slice = codes.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .in("product_code", slice);
    if (error) throw error;
    for (const r of data as Row[]) existingMap.set(r.product_code.toUpperCase(), r);
  }

  const toInsert: any[] = [];
  const toUpdate: Array<{ id: string; row: Record<string, any>; code: string }> = [];

  for (const r of rows) {
    const code = r.productCode.trim();
    if (!code) {
      result.errors.push({ productCode: "(empty)", error: "Missing product code" });
      continue;
    }
    const existing = existingMap.get(code.toUpperCase());
    if (mode === "add") {
      if (existing) {
        result.skipped++;
        continue;
      }
      if (!r.name?.trim()) {
        result.errors.push({ productCode: code, error: "Name required for new product" });
        continue;
      }
      toInsert.push(toInsertRow(r));
    } else {
      if (!existing) {
        result.skipped++;
        continue;
      }
      toUpdate.push({ id: existing.id, row: toUpdateRow(r, existing, mode), code });
    }
  }

  // Batch insert
  if (toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += 100) {
      const slice = toInsert.slice(i, i + 100);
      const { error, data } = await supabase.from("products").insert(slice).select("id");
      if (error) {
        for (const ins of slice) {
          result.errors.push({ productCode: ins.product_code, error: error.message });
        }
      } else {
        result.inserted += (data?.length ?? slice.length);
      }
    }
  }

  // Parallel updates with concurrency cap
  const CONCURRENCY = 8;
  for (let i = 0; i < toUpdate.length; i += CONCURRENCY) {
    const batch = toUpdate.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (u) => {
        const { error } = await supabase.from("products").update(u.row).eq("id", u.id);
        if (error) result.errors.push({ productCode: u.code, error: error.message });
        else result.updated++;
      })
    );
  }

  return result;
}
