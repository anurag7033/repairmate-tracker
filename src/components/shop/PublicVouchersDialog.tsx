import { useEffect, useState } from "react";
import { Ticket, Loader2, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PublicVoucher {
  voucher_code: string;
  voucher_name: string | null;
  discount_type: string;
  discount_amount: number;
  discount_percentage: number;
  min_order_amount: number;
  max_order_amount: number;
  expiry_date: string | null;
}

interface Props {
  onSelect?: (code: string) => void;
  triggerClassName?: string;
  triggerLabel?: string;
}

const PublicVouchersDialog = ({ onSelect, triggerClassName, triggerLabel }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vouchers, setVouchers] = useState<PublicVoucher[]>([]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_public_vouchers");
      if (error) toast.error("Could not load vouchers");
      setVouchers(((data as unknown) as PublicVoucher[]) || []);
      setLoading(false);
    };
    load();
  }, [open]);

  const valueLabel = (v: PublicVoucher) =>
    v.discount_type === "percentage"
      ? `${Number(v.discount_percentage)}% OFF`
      : `₹${Number(v.discount_amount).toLocaleString("en-IN")} OFF`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={
            triggerClassName ||
            "text-xs font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2 inline-flex items-center gap-1"
          }
        >
          <Ticket className="w-3.5 h-3.5" />
          {triggerLabel || "View all public vouchers"}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Available Vouchers</DialogTitle>
          <DialogDescription>
            Public offers you can use on online orders. Tap a code to use it.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : vouchers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No public vouchers are available right now.
          </p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {vouchers.map((v) => (
              <div
                key={v.voucher_code}
                className="border border-dashed border-orange-200 bg-orange-50/60 rounded-xl p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold tracking-wide">{v.voucher_code}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-orange-500 text-white">
                      {valueLabel(v)}
                    </span>
                  </div>
                  {v.voucher_name && (
                    <p className="text-sm font-medium mt-1">{v.voucher_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {Number(v.min_order_amount) > 0
                      ? `Min order ₹${Number(v.min_order_amount).toLocaleString("en-IN")}`
                      : "No minimum order"}
                    {Number(v.max_order_amount) > 0
                      ? ` · Max order ₹${Number(v.max_order_amount).toLocaleString("en-IN")}`
                      : ""}
                    {v.expiry_date
                      ? ` · Valid till ${new Date(v.expiry_date).toLocaleDateString("en-IN")}`
                      : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 bg-slate-900 hover:bg-black text-white rounded-lg"
                  onClick={() => {
                    if (onSelect) {
                      onSelect(v.voucher_code);
                      setOpen(false);
                    } else {
                      navigator.clipboard?.writeText(v.voucher_code);
                      toast.success(`${v.voucher_code} copied`);
                    }
                  }}
                >
                  {onSelect ? "Use" : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PublicVouchersDialog;
