import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  onScan: (code: string) => void;
  label?: string;
  variant?: "outline" | "default" | "secondary";
  className?: string;
  iconOnly?: boolean;
  title?: string;
}

/** Camera-based scanner for product barcodes / IMEI / any 1D-2D code. */
const ProductBarcodeScanner = ({
  onScan, label = "Scan", variant = "outline", className = "",
  iconOnly = false, title = "Scan Product Barcode",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = useRef("pscan-" + Math.random().toString(36).slice(2));

  const stop = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch {/* ignore */}
    scannerRef.current = null;
  };

  const start = async () => {
    setError("");
    try {
      const s = new Html5Qrcode(containerId.current);
      scannerRef.current = s;
      await s.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 140 } },
        (decoded) => {
          onScan(decoded.trim());
          stop();
          setOpen(false);
        },
        () => {}
      );
    } catch {
      setError("Camera access denied or not available.");
    }
  };

  useEffect(() => {
    if (open) setTimeout(start, 250);
    return () => { stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={iconOnly ? "icon" : "default"}
        className={className}
        onClick={() => setOpen(true)}
        title={title}
      >
        <ScanLine className={iconOnly ? "w-4 h-4" : "w-4 h-4 mr-2"} />
        {!iconOnly && label}
      </Button>
      <Dialog open={open} onOpenChange={(v) => { if (!v) stop(); setOpen(v); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div id={containerId.current} className="w-full rounded-lg overflow-hidden bg-black/5" />
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
            <p className="text-xs text-muted-foreground text-center">
              Point camera at the product barcode.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductBarcodeScanner;
