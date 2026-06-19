import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { bulkSetStock, getProductsByCodes } from "@/lib/productStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

type ParsedRow = {
  rowIndex: number;
  productCode: string;
  qtyAdded: number;
  rawQty: any;
  // Resolved
  productId?: string;
  productName?: string;
  currentStock?: number;
  newStock?: number;
  error?: string;
};

const HEADER_ALIASES: Record<string, string[]> = {
  productCode: ["product code", "productcode", "code", "sku", "product_code"],
  qtyAdded: [
    "quantity added", "qty added", "qtyadded", "quantity", "qty",
    "stock", "stock added", "stock_added", "add quantity", "quantity_added",
  ],
};

const pickField = (row: Record<string, any>, keys: string[]) => {
  const normalized: Record<string, any> = {};
  for (const k of Object.keys(row)) normalized[k.trim().toLowerCase()] = row[k];
  for (const k of keys) {
    if (k in normalized && normalized[k] !== undefined && normalized[k] !== "") return normalized[k];
  }
  return undefined;
};

const BulkStockUpdateDialog = ({ open, onOpenChange, onCompleted }: Props) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  const reset = () => {
    setRows([]);
    setFileName("");
    setProgress(0);
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
        const rawCode = pickField(r, HEADER_ALIASES.productCode);
        const rawQty = pickField(r, HEADER_ALIASES.qtyAdded);
        const productCode = String(rawCode ?? "").trim().toUpperCase();
        const qtyAdded = Number(rawQty);
        let error: string | undefined;
        if (!productCode) error = "Missing product code";
        else if (!Number.isFinite(qtyAdded)) error = "Invalid quantity";
        return {
          rowIndex: i + 2, // +2 = header row + 1-indexed
          productCode,
          qtyAdded: Number.isFinite(qtyAdded) ? qtyAdded : 0,
          rawQty,
          error,
        };
      });

      if (parsed.length === 0) {
        toast({ title: "Empty file", description: "No rows found in the sheet.", variant: "destructive" });
        setParsing(false);
        return;
      }

      // Resolve product codes in one batched call
      const codes = parsed.filter((r) => !r.error).map((r) => r.productCode);
      const lookup = await getProductsByCodes(codes);

      const resolved = parsed.map((r) => {
        if (r.error) return r;
        const hit = lookup.get(r.productCode.toUpperCase());
        if (!hit) return { ...r, error: "Product code not found" };
        return {
          ...r,
          productId: hit.id,
          productName: hit.name,
          currentStock: hit.stockQuantity,
          newStock: Math.max(0, hit.stockQuantity + Math.floor(r.qtyAdded)),
        };
      });

      setRows(resolved);
    } catch (err: any) {
      toast({ title: "Failed to read file", description: err.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const validRows = rows.filter((r) => !r.error && r.productId);
  const errorCount = rows.length - validRows.length;

  const apply = async () => {
    if (validRows.length === 0) return;
    setApplying(true);
    setProgress(0);
    try {
      // Merge multiple lines for same product → sum increments
      const map = new Map<string, { id: string; newStock: number }>();
      for (const r of validRows) {
        const existing = map.get(r.productId!);
        if (existing) existing.newStock = Math.max(0, existing.newStock + Math.floor(r.qtyAdded));
        else map.set(r.productId!, { id: r.productId!, newStock: r.newStock! });
      }
      const updates = Array.from(map.values()).map((m) => ({ id: m.id, stockQuantity: m.newStock }));
      await bulkSetStock(updates);
      setProgress(updates.length);
      toast({
        title: "Stock updated",
        description: `${updates.length} product${updates.length === 1 ? "" : "s"} updated successfully.`,
      });
      onCompleted?.();
      onOpenChange(false);
      setTimeout(reset, 300);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Product Code", "Quantity Added"],
      ["CH001", 20],
      ["DC001", 50],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Update");
    XLSX.writeFile(wb, "bulk-stock-template.xlsx");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Bulk Stock Update
          </DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV with columns <span className="font-mono">Product Code</span> and{" "}
            <span className="font-mono">Quantity Added</span>. Stock will be increased for each matched product.
          </DialogDescription>
        </DialogHeader>

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
                <CheckCircle2 className="w-3 h-3" /> {validRows.length} ready
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
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0 z-10 text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Row</th>
                      <th className="text-left px-3 py-2 font-semibold">Code</th>
                      <th className="text-left px-3 py-2 font-semibold">Product</th>
                      <th className="text-right px-3 py-2 font-semibold">Current</th>
                      <th className="text-right px-3 py-2 font-semibold">+ Qty</th>
                      <th className="text-right px-3 py-2 font-semibold">New</th>
                      <th className="text-left px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.rowIndex} className={`border-t border-border ${r.error ? "bg-destructive/5" : ""}`}>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{r.rowIndex}</td>
                        <td className="px-3 py-2 font-mono text-xs">{r.productCode || "—"}</td>
                        <td className="px-3 py-2">{r.productName || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.currentStock ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{String(r.rawQty ?? "")}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-primary">
                          {r.newStock ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">
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
                disabled={applying || validRows.length === 0}
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Applying {progress}/{validRows.length}...
                  </>
                ) : (
                  <>Apply {validRows.length} update{validRows.length === 1 ? "" : "s"}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkStockUpdateDialog;
