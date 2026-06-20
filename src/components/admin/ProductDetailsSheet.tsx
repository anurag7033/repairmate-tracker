import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Edit, Barcode as BarcodeIcon, Plus, Minus, Loader2 } from "lucide-react";
import { Product, stockStatusOf, STOCK_STATUS_LABEL } from "@/types/product";
import { adjustProductStock } from "@/lib/productStore";
import { useToast } from "@/hooks/use-toast";

interface Props {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged?: (p: Product) => void;
  onEdit?: (p: Product) => void;
  onPrintBarcode?: (p: Product) => void;
}

const ProductDetailsSheet = ({ product, open, onOpenChange, onChanged, onEdit, onPrintBarcode }: Props) => {
  const { toast } = useToast();
  const [delta, setDelta] = useState<number>(1);
  const [busy, setBusy] = useState(false);

  if (!product) return null;
  const ss = stockStatusOf(product);

  const adjust = async (sign: 1 | -1) => {
    try {
      setBusy(true);
      const updated = await adjustProductStock(product.id, sign * Math.abs(Math.floor(delta)));
      toast({ title: "Stock updated", description: `${product.name}: ${updated.stockQuantity} in stock` });
      onChanged?.(updated);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base font-display">{product.name}</SheetTitle>
          <SheetDescription className="font-mono text-xs">{product.productCode}</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover rounded-xl border border-border" />
          ) : (
            <div className="w-full h-48 rounded-xl bg-muted flex items-center justify-center">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-muted-foreground">Brand</div>
              <div className="font-semibold">{product.brand || "—"}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-muted-foreground">Category</div>
              <div className="font-semibold">{product.category || "—"}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-muted-foreground">Selling Price</div>
              <div className="font-semibold">₹{product.sellingPrice.toLocaleString("en-IN")}</div>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <div className="text-muted-foreground">Final Price</div>
              <div className="font-bold text-primary">₹{product.finalPrice.toLocaleString("en-IN")}</div>
            </div>
            {product.purchasePrice > 0 && (
              <div className="p-3 rounded-lg bg-success/10 col-span-2">
                <div className="text-muted-foreground">Purchase price (admin only)</div>
                <div className="font-semibold">
                  ₹{product.purchasePrice.toLocaleString("en-IN")} •{" "}
                  <span className="text-success">Profit/unit: ₹{(product.sellingPrice - product.purchasePrice).toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold">Stock</Label>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                ss === "in_stock" ? "bg-success/10 text-success border-success/30" :
                ss === "low_stock" ? "bg-warning/10 text-warning border-warning/30" :
                "bg-destructive/10 text-destructive border-destructive/30"
              }`}>{STOCK_STATUS_LABEL[ss]}</span>
            </div>
            <div className="text-2xl font-bold">{product.stockQuantity}</div>
            <div className="text-[10px] text-muted-foreground mb-3">Low-stock at: {product.lowStockThreshold}</div>
            <div className="flex items-center gap-2">
              <Input
                type="number" min={1} value={delta}
                onChange={(e) => setDelta(Math.max(1, Number(e.target.value) || 1))}
                className="h-9 rounded-lg w-24"
              />
              <Button size="sm" variant="outline" className="rounded-lg" disabled={busy} onClick={() => adjust(1)}>
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg text-destructive border-destructive/30"
                disabled={busy} onClick={() => adjust(-1)}>
                <Minus className="w-3 h-3" /> Remove
              </Button>
            </div>
          </div>

          {product.description && (
            <div className="text-xs">
              <div className="text-muted-foreground mb-1 font-semibold">Description</div>
              <p className="text-foreground/80 leading-relaxed">{product.description}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {onEdit && (
              <Button variant="outline" className="rounded-lg flex-1" onClick={() => onEdit(product)}>
                <Edit className="w-4 h-4 mr-1" /> Edit
              </Button>
            )}
            {onPrintBarcode && (
              <Button variant="outline" className="rounded-lg flex-1" onClick={() => onPrintBarcode(product)}>
                <BarcodeIcon className="w-4 h-4 mr-1" /> Barcode
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProductDetailsSheet;
