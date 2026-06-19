import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Download, PlusCircle, RefreshCw, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { bulkImportProducts, ImportMode, ImportRowInput } from "@/lib/productStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

type ParsedRow = ImportRowInput & {
  rowIndex: number;
  error?: string;
};

const ALIAS: Record<string, string[]> = {
  productCode: ["product code", "productcode", "code", "sku", "product_code"],
  name: ["product name", "name", "title"],
  category: ["category"],
  brand: ["brand"],
  description: ["description", "desc"],
  imageUrl: ["image url", "image", "image_url", "imageurl"],
  sellingPrice: ["selling price", "price", "mrp", "selling_price"],
  purchasePrice: ["purchase price", "cost", "cost price", "purchase_price"],
  discountType: ["discount type", "discount_type"],
  discountValue: ["discount value", "discount", "discount_value"],
  stockQuantity: ["stock", "stock quantity", "quantity", "qty", "stock_quantity"],
  lowStockThreshold: ["low stock", "low stock threshold", "threshold", "low_stock_threshold"],
  status: ["status"],
};

const pick = (row: Record<string, any>, keys: string[]) => {
  const n: Record<string, any> = {};
  for (const k of Object.keys(row)) n[k.trim().toLowerCase()] = row[k];
  for (const k of keys) if (k in n && n[k] !== undefined && n[k] !== "") return n[k];
  return undefined;
};

const MODE_LABEL: Record<ImportMode, string> = {
  add: "Add New",
  update: "Update Existing",
  merge: "Merge Inventory",
};

const MODE_DESC: Record<ImportMode, string> = {
  add: "Insert only new product codes. Existing codes are skipped.",
  update: "Overwrite fields on existing products. New codes are skipped.",
  merge: "Add stock quantities to existing products and fill missing fields. New codes are skipped.",
};

const BulkProductImportDialog = ({ open, onOpenChange, onCompleted }: Props) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [mode, setMode] = useState<ImportMode>("add");

  const reset = () => {
    setRows([]);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setParsing(true);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

      const parsed: ParsedRow[] = json.map((r, i) => {
        const code = String(pick(r, ALIAS.productCode) ?? "").trim().toUpperCase();
        const sp = pick(r, ALIAS.sellingPrice);
        const pp = pick(r, ALIAS.purchasePrice);
        const dv = pick(r, ALIAS.discountValue);
        const stk = pick(r, ALIAS.stockQuantity);
        const lst = pick(r, ALIAS.lowStockThreshold);
        const dt = String(pick(r, ALIAS.discountType) ?? "").toLowerCase();
        const st = String(pick(r, ALIAS.status) ?? "").toLowerCase();
        const row: ParsedRow = {
          rowIndex: i + 2,
          productCode: code,
          name: String(pick(r, ALIAS.name) ?? "").trim(),
          category: String(pick(r, ALIAS.category) ?? "").trim(),
          brand: String(pick(r, ALIAS.brand) ?? "").trim(),
          description: String(pick(r, ALIAS.description) ?? ""),
          imageUrl: pick(r, ALIAS.imageUrl) ? String(pick(r, ALIAS.imageUrl)) : null,
          sellingPrice: sp === "" || sp === undefined ? undefined : Number(sp),
          purchasePrice: pp === "" || pp === undefined ? undefined : Number(pp),
          discountType: dt === "percentage" ? "percentage" : dt === "amount" ? "amount" : undefined,
          discountValue: dv === "" || dv === undefined ? undefined : Number(dv),
          stockQuantity: stk === "" || stk === undefined ? undefined : Number(stk),
          lowStockThreshold: lst === "" || lst === undefined ? undefined : Number(lst),
          status: st === "active" ? "active" : st === "inactive" ? "inactive" : undefined,
        };
        if (!row.productCode) row.error = "Missing product code";
        else if (row.sellingPrice !== undefined && !Number.isFinite(row.sellingPrice)) row.error = "Invalid selling price";
        else if (row.stockQuantity !== undefined && !Number.isFinite(row.stockQuantity)) row.error = "Invalid stock";
        return row;
      });

      if (parsed.length === 0) {
        toast({ title: "Empty file", description: "No rows found.", variant: "destructive" });
      }
      setRows(parsed);
    } catch (err: any) {
      toast({ title: "Failed to read file", description: err.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const valid = rows.filter((r) => !r.error);
  const errorCount = rows.length - valid.length;

  const apply = async () => {
    if (valid.length === 0) return;
    setApplying(true);
    try {
      const result = await bulkImportProducts(valid, mode);
      toast({
        title: "Import complete",
        description: `Inserted ${result.inserted}, updated ${result.updated}, skipped ${result.skipped}${result.errors.length ? `, errors ${result.errors.length}` : ""}.`,
        variant: result.errors.length > 0 ? "destructive" : "default",
      });
      onCompleted?.();
      onOpenChange(false);
      setTimeout(reset, 300);
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "Product Code", "Product Name", "Category", "Brand", "Description",
        "Image URL", "Selling Price", "Purchase Price", "Discount Type",
        "Discount Value", "Stock", "Low Stock Threshold", "Status",
      ],
      ["CH001", "USB-C Charger 20W", "Chargers", "Anker", "Fast charger", "", 999, 600, "amount", 100, 25, 5, "active"],
      ["DC001", "Lightning Cable 1m", "Cables", "Apple", "MFi certified", "", 799, 400, "percentage", 10, 40, 5, "active"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "bulk-products-template.xlsx");
  };

  const ModeButton = ({ m, icon }: { m: ImportMode; icon: JSX.Element }) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 min-w-[140px] text-left p-3 rounded-xl border transition-colors ${
        mode === m
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center gap-2 font-semibold text-sm">
        {icon}
        {MODE_LABEL[m]}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{MODE_DESC[m]}</div>
    </button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Bulk Product Import
          </DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file and choose an import mode. Preview rows before applying.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mb-2">
          <ModeButton m="add" icon={<PlusCircle className="w-4 h-4 text-primary" />} />
          <ModeButton m="update" icon={<RefreshCw className="w-4 h-4 text-primary" />} />
          <ModeButton m="merge" icon={<Layers className="w-4 h-4 text-primary" />} />
        </div>

        {rows.length === 0 ? (
          <div className="space-y-3">
            <label className="block border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:bg-muted/40 transition-colors">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
                disabled={parsing}
              />
              {parsing ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm">Reading {fileName}...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-primary" />
                  <p className="font-semibold">Click to upload file</p>
                  <p className="text-xs text-muted-foreground">.xlsx, .xls or .csv</p>
                </div>
              )}
            </label>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download template
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{fileName}</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">
                <CheckCircle2 className="w-3 h-3" /> {valid.length} ready
              </span>
              {errorCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
                  <AlertTriangle className="w-3 h-3" /> {errorCount} with errors
                </span>
              )}
              <Button variant="ghost" size="sm" className="ml-auto rounded-lg" onClick={reset}>
                Choose another file
              </Button>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <div className="max-h-[50vh] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0 z-10 text-muted-foreground">
                    <tr>
                      <th className="text-left px-2 py-2 font-semibold">Row</th>
                      <th className="text-left px-2 py-2 font-semibold">Code</th>
                      <th className="text-left px-2 py-2 font-semibold">Name</th>
                      <th className="text-left px-2 py-2 font-semibold">Category</th>
                      <th className="text-left px-2 py-2 font-semibold">Brand</th>
                      <th className="text-right px-2 py-2 font-semibold">Price</th>
                      <th className="text-right px-2 py-2 font-semibold">Disc</th>
                      <th className="text-right px-2 py-2 font-semibold">Stock</th>
                      <th className="text-left px-2 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.rowIndex} className={`border-t border-border ${r.error ? "bg-destructive/5" : ""}`}>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.rowIndex}</td>
                        <td className="px-2 py-1.5 font-mono">{r.productCode || "—"}</td>
                        <td className="px-2 py-1.5">{r.name || "—"}</td>
                        <td className="px-2 py-1.5">{r.category || "—"}</td>
                        <td className="px-2 py-1.5">{r.brand || "—"}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{r.sellingPrice ?? "—"}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {r.discountValue !== undefined ? `${r.discountValue}${r.discountType === "percentage" ? "%" : ""}` : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{r.stockQuantity ?? "—"}</td>
                        <td className="px-2 py-1.5">
                          {r.error ? (
                            <span className="text-destructive">{r.error}</span>
                          ) : (
                            <span className="text-success">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={applying}>
                Cancel
              </Button>
              <Button
                className="rounded-xl font-semibold"
                onClick={apply}
                disabled={applying || valid.length === 0}
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...
                  </>
                ) : (
                  <>Import {valid.length} as {MODE_LABEL[mode]}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkProductImportDialog;
