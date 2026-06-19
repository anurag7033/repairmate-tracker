import { useEffect, useMemo, useState } from "react";
import {
  Plus, Search, Edit, Trash2, Loader2, Package, ImagePlus, X, Upload, Barcode as BarcodeIcon,
} from "lucide-react";
import BulkStockUpdateDialog from "./BulkStockUpdateDialog";
import BarcodeLabelDialog from "./BarcodeLabelDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Product,
  stockStatusOf,
  STOCK_STATUS_LABEL,
  StockStatus,
} from "@/types/product";
import {
  getProducts, addProduct, updateProduct, deleteProduct, uploadProductImage,
  ProductInput,
} from "@/lib/productStore";

const emptyInput = (): ProductInput => ({
  productCode: "",
  name: "",
  category: "",
  brand: "",
  description: "",
  imageUrl: null,
  sellingPrice: 0,
  purchasePrice: 0,
  discountType: "amount",
  discountValue: 0,
  stockQuantity: 0,
  lowStockThreshold: 5,
  status: "active",
});

const computeFinalPrice = (p: Pick<ProductInput, "sellingPrice" | "discountType" | "discountValue">) => {
  const sp = Number(p.sellingPrice) || 0;
  const dv = Number(p.discountValue) || 0;
  const fp = p.discountType === "percentage" ? sp - (sp * dv) / 100 : sp - dv;
  return Math.max(0, Math.round(fp * 100) / 100);
};

const stockBadge = (s: StockStatus) => {
  if (s === "in_stock") return "bg-success/10 text-success border-success/30";
  if (s === "low_stock") return "bg-warning/10 text-warning border-warning/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
};

const ProductsSection = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<"all" | StockStatus>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductInput>(emptyInput());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const categories = useMemo(
    () => Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort(),
    [products]
  );
  const brands = useMemo(
    () => Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (q && !(
        p.name.toLowerCase().includes(q) ||
        p.productCode.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (brandFilter !== "all" && p.brand !== brandFilter) return false;
      if (stockFilter !== "all" && stockStatusOf(p) !== stockFilter) return false;
      return true;
    });
  }, [products, search, categoryFilter, brandFilter, stockFilter]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyInput());
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      productCode: p.productCode,
      name: p.name,
      category: p.category,
      brand: p.brand,
      description: p.description,
      imageUrl: p.imageUrl,
      sellingPrice: p.sellingPrice,
      purchasePrice: p.purchasePrice,
      discountType: p.discountType,
      discountValue: p.discountValue,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      status: p.status,
    });
    setDialogOpen(true);
  };

  const handleImage = async (file: File | null) => {
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadProductImage(file);
      setForm(f => ({ ...f, imageUrl: url }));
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.productCode.trim()) {
      toast({ title: "Product code is required", variant: "destructive" });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: "Product name is required", variant: "destructive" });
      return;
    }
    if (form.sellingPrice < 0 || form.discountValue < 0 || form.stockQuantity < 0) {
      toast({ title: "Values must be non-negative", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await updateProduct(editingId, form);
        toast({ title: "Product updated" });
      } else {
        await addProduct(form);
        toast({ title: "Product added" });
      }
      setDialogOpen(false);
      refresh();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      toast({ title: "Product deleted" });
      refresh();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const finalPreview = computeFinalPrice(form);

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, brand, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-11 rounded-xl w-full lg:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="h-11 rounded-xl w-full lg:w-40"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as any)}>
          <SelectTrigger className="h-11 rounded-xl w-full lg:w-40"><SelectValue placeholder="Stock" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setBulkOpen(true)} variant="outline" className="h-11 rounded-xl font-semibold">
          <Upload className="w-4 h-4 mr-2" />Bulk Stock Update
        </Button>
        <Button onClick={openAdd} className="h-11 rounded-xl font-semibold">
          <Plus className="w-4 h-4 mr-2" />Add Product
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading products...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{products.length === 0 ? "No products yet. Click 'Add Product' to create one." : "No products match your filters."}</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-3 font-semibold">Image</th>
                  <th className="text-left px-3 py-3 font-semibold">Product</th>
                  <th className="text-left px-3 py-3 font-semibold">Code</th>
                  <th className="text-left px-3 py-3 font-semibold">Category</th>
                  <th className="text-left px-3 py-3 font-semibold">Price</th>
                  <th className="text-left px-3 py-3 font-semibold">Discount</th>
                  <th className="text-left px-3 py-3 font-semibold">Final</th>
                  <th className="text-left px-3 py-3 font-semibold">Stock</th>
                  <th className="text-left px-3 py-3 font-semibold">Status</th>
                  <th className="text-right px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const ss = stockStatusOf(p);
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-lg object-cover border border-border" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.brand}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">{p.productCode}</td>
                      <td className="px-3 py-3 text-xs">{p.category || "—"}</td>
                      <td className="px-3 py-3">
                        {p.discountValue > 0 ? (
                          <span className="line-through text-muted-foreground">₹{p.sellingPrice.toLocaleString("en-IN")}</span>
                        ) : (
                          <span>₹{p.sellingPrice.toLocaleString("en-IN")}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {p.discountValue > 0
                          ? (p.discountType === "percentage" ? `${p.discountValue}%` : `₹${p.discountValue}`)
                          : "—"}
                      </td>
                      <td className="px-3 py-3 font-semibold text-primary">₹{p.finalPrice.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold">{p.stockQuantity}</span>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border w-fit ${stockBadge(ss)}`}>
                            {STOCK_STATUS_LABEL[ss]}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                          {p.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => openEdit(p)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="rounded-lg text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove <span className="font-semibold">{p.name}</span> ({p.productCode}).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(p.id)}
                                >Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex items-center gap-4">
              {form.imageUrl ? (
                <div className="relative">
                  <img src={form.imageUrl} alt="Product" className="w-24 h-24 rounded-xl object-cover border border-border" />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, imageUrl: null }))}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImage(e.target.files?.[0] || null)}
                  disabled={uploading}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-input bg-background hover:bg-muted text-sm font-medium">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                  {uploading ? "Uploading..." : (form.imageUrl ? "Replace image" : "Upload image")}
                </span>
              </label>
            </div>

            <div>
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl" />
            </div>
            <div>
              <Label>Product Code *</Label>
              <Input
                value={form.productCode}
                onChange={(e) => setForm(f => ({ ...f, productCode: e.target.value.toUpperCase() }))}
                placeholder="e.g. AM001, LCD-IP11"
                className="rounded-xl font-mono"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Display, Battery" className="rounded-xl" />
            </div>
            <div>
              <Label>Brand</Label>
              <Input value={form.brand} onChange={(e) => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. Apple, Vivo" className="rounded-xl" />
            </div>
            <div>
              <Label>Selling Price (₹) *</Label>
              <Input type="number" min={0} value={form.sellingPrice}
                onChange={(e) => setForm(f => ({ ...f, sellingPrice: Number(e.target.value) || 0 }))}
                className="rounded-xl" />
            </div>
            <div>
              <Label>Purchase Price (₹) <span className="text-xs text-muted-foreground">(admin only)</span></Label>
              <Input type="number" min={0} value={form.purchasePrice}
                onChange={(e) => setForm(f => ({ ...f, purchasePrice: Number(e.target.value) || 0 }))}
                className="rounded-xl" />
              {form.purchasePrice > 0 && form.sellingPrice > 0 && (
                <p className="text-xs text-success mt-1">
                  Profit/unit: ₹{(form.sellingPrice - form.purchasePrice).toLocaleString("en-IN")}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Discount Type</Label>
                <Select value={form.discountType} onValueChange={(v) => setForm(f => ({ ...f, discountType: v as any }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">₹ Amount</SelectItem>
                    <SelectItem value="percentage">% Percent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value</Label>
                <Input type="number" min={0} value={form.discountValue}
                  onChange={(e) => setForm(f => ({ ...f, discountValue: Number(e.target.value) || 0 }))}
                  className="rounded-xl" />
              </div>
            </div>
            <div>
              <Label>Stock Quantity</Label>
              <Input type="number" min={0} value={form.stockQuantity}
                onChange={(e) => setForm(f => ({ ...f, stockQuantity: Number(e.target.value) || 0 }))}
                className="rounded-xl" />
            </div>
            <div>
              <Label>Low Stock Threshold</Label>
              <Input type="number" min={0} value={form.lowStockThreshold}
                onChange={(e) => setForm(f => ({ ...f, lowStockThreshold: Number(e.target.value) || 0 }))}
                className="rounded-xl" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 p-3 rounded-xl bg-muted/50 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Final Price (auto)</span>
              <span className="text-lg font-bold text-primary">₹{finalPreview.toLocaleString("en-IN")}</span>
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="rounded-xl" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl font-semibold" onClick={handleSave} disabled={saving || uploading}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingId ? "Save Changes" : "Add Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsSection;
