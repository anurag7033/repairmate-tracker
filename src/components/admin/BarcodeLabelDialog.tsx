import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Printer, Barcode as BarcodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Product } from "@/types/product";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

const BarcodeLabelDialog = ({ open, onOpenChange, product }: Props) => {
  const [copies, setCopies] = useState(12);
  const previewRef = useRef<SVGSVGElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const code = useMemo(() => (product?.productCode || "").trim(), [product]);

  useEffect(() => {
    if (!open || !code || !previewRef.current) return;
    try {
      JsBarcode(previewRef.current, code, {
        format: "CODE128",
        displayValue: true,
        height: 50,
        width: 1.6,
        fontSize: 12,
        margin: 6,
      });
    } catch {
      /* ignore */
    }
  }, [open, code]);

  useEffect(() => {
    if (!open || !sheetRef.current || !code) return;
    const svgs = sheetRef.current.querySelectorAll<SVGSVGElement>("svg.label-barcode");
    svgs.forEach((svg) => {
      try {
        JsBarcode(svg, code, {
          format: "CODE128",
          displayValue: true,
          height: 40,
          width: 1.4,
          fontSize: 11,
          margin: 2,
        });
      } catch {
        /* ignore */
      }
    });
  }, [open, code, copies, product]);

  const handlePrint = () => {
    if (!sheetRef.current) return;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const html = sheetRef.current.innerHTML;
    w.document.write(`<!doctype html><html><head><title>Barcode Labels - ${code}</title>
<style>
  @page { size: A4; margin: 8mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
  .sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
  .label { border: 1px dashed #999; border-radius: 6px; padding: 6px;
           text-align: center; page-break-inside: avoid; }
  .label .name { font-size: 11px; font-weight: 700; margin-bottom: 2px;
                 white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .label .price { font-size: 11px; margin-top: 2px; }
  .label svg { width: 100%; height: auto; }
</style></head><body><div class="sheet">${html}</div>
<script>window.onload = () => { setTimeout(() => { window.print(); }, 150); };<\/script>
</body></html>`);
    w.document.close();
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarcodeIcon className="w-5 h-5 text-primary" />
            Print Barcode Labels
          </DialogTitle>
          <DialogDescription>
            {product.name} <span className="font-mono">({product.productCode})</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center bg-muted/40 rounded-xl p-4">
          <svg ref={previewRef} />
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label>Number of labels</Label>
            <Input
              type="number"
              min={1}
              max={300}
              value={copies}
              onChange={(e) => setCopies(Math.max(1, Math.min(300, Number(e.target.value) || 1)))}
              className="rounded-xl"
            />
          </div>
          <Button onClick={handlePrint} className="rounded-xl font-semibold">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        {/* Hidden sheet used as source HTML for the print window */}
        <div className="hidden">
          <div ref={sheetRef}>
            {Array.from({ length: copies }).map((_, i) => (
              <div className="label" key={i}>
                <div className="name">{product.name}</div>
                <svg className="label-barcode" />
                <div className="price">₹{product.finalPrice.toLocaleString("en-IN")}</div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeLabelDialog;
