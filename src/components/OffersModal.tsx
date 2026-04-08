import { useEffect, useState } from "react";
import { Ticket, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { getActivePublicVouchers } from "@/lib/repairStore";

interface Props {
  onApply: (code: string) => void;
}

const OffersModal = ({ onApply }: Props) => {
  const [open, setOpen] = useState(false);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const data = await getActivePublicVouchers();
      setVouchers(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (open) loadOffers();
  }, [open]);

  const getDiscountText = (v: any) =>
    v.discount_type === "percentage" ? `${v.discount_percentage}% Off` : `₹${v.discount_amount} Off`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/5">
          <Sparkles className="w-4 h-4" />
          View All Offers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Available Offers
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-center py-8 text-muted-foreground animate-pulse">Loading offers...</p>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No active offers right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vouchers.map((v) => (
              <div key={v.id} className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-primary text-lg">{v.voucher_code}</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-success/10 text-success">Active</span>
                </div>
                {v.voucher_name && <p className="text-sm font-medium mb-1">{v.voucher_name}</p>}
                <div className="flex items-center gap-3 text-sm mb-3">
                  <span className="font-semibold text-primary">{getDiscountText(v)}</span>
                  {v.expiry_date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires: {new Date(v.expiry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
                {(v.min_order_amount > 0 || v.max_order_amount > 0) && (
                  <p className="text-xs text-muted-foreground mb-3">
                    {v.min_order_amount > 0 && `Min: ₹${v.min_order_amount}`}
                    {v.min_order_amount > 0 && v.max_order_amount > 0 && " • "}
                    {v.max_order_amount > 0 && `Max: ₹${v.max_order_amount}`}
                  </p>
                )}
                <Button
                  size="sm"
                  className="w-full rounded-lg"
                  style={{ backgroundColor: "#f97316", color: "white" }}
                  onClick={() => {
                    onApply(v.voucher_code);
                    setOpen(false);
                  }}
                >
                  Apply Voucher
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OffersModal;
