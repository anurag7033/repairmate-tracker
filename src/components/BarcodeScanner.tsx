import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BarcodeScannerProps {
  onScan: (value: string) => void;
}

const BarcodeScanner = ({ onScan }: BarcodeScannerProps) => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>("barcode-reader-" + Math.random().toString(36).slice(2));

  const startScanner = async () => {
    setError("");
    try {
      const scanner = new Html5Qrcode(containerRef.current);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 120 } },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
          setOpen(false);
        },
        () => {}
      );
    } catch (err: any) {
      setError("Camera access denied or not available.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      scannerRef.current.clear();
    }
    scannerRef.current = null;
  };

  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      setTimeout(startScanner, 300);
    }
    return () => { stopScanner(); };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-lg shrink-0"
        onClick={() => setOpen(true)}
        title="Scan IMEI Barcode"
      >
        <Camera className="w-4 h-4" />
      </Button>
      <Dialog open={open} onOpenChange={(v) => { if (!v) stopScanner(); setOpen(v); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Scan IMEI Barcode</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div id={containerRef.current} className="w-full rounded-lg overflow-hidden" />
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
            <p className="text-xs text-muted-foreground text-center">
              Point camera at the IMEI barcode on the phone
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BarcodeScanner;
