import { useState, useEffect } from "react";
import {
  Plus, Ticket, Send, Trash2, Search, Percent, IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateVoucherCode, getWhatsAppLink } from "@/lib/repairStore";

interface Voucher {
  id: string;
  voucher_code: string;
  voucher_name: string;
  discount_type: string;
  discount_amount: number;
  discount_percentage: number;
  min_order_amount: number;
  max_order_amount: number;
  is_used: boolean;
  tracking_id: string | null;
  created_at: string;
}

const AdminVoucherSection = () => {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percentage">("amount");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [minAmount, setMinAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(0);

  const fetchVouchers = async () => {
    const { data, error } = await supabase
      .from("vouchers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setVouchers((data as Voucher[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const resetForm = () => {
    setName("");
    setDiscountType("amount");
    setDiscountAmount(0);
    setDiscountPercentage(0);
    setMinAmount(0);
    setMaxAmount(0);
  };

  const handleCreate = async () => {
    if (discountType === "amount" && discountAmount <= 0) {
      toast({ title: "Invalid", description: "Enter a valid discount amount.", variant: "destructive" });
      return;
    }
    if (discountType === "percentage" && (discountPercentage <= 0 || discountPercentage > 100)) {
      toast({ title: "Invalid", description: "Enter a valid percentage (1-100).", variant: "destructive" });
      return;
    }
    if (maxAmount > 0 && minAmount > maxAmount) {
      toast({ title: "Invalid", description: "Min amount cannot be greater than max amount.", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const code = generateVoucherCode();
      const { error } = await supabase
        .from("vouchers")
        .insert({
          voucher_code: code,
          voucher_name: name || (discountType === "amount" ? `₹${discountAmount} Off` : `${discountPercentage}% Off`),
          discount_type: discountType,
          discount_amount: discountType === "amount" ? discountAmount : 0,
          discount_percentage: discountType === "percentage" ? discountPercentage : 0,
          min_order_amount: minAmount,
          max_order_amount: maxAmount,
          tracking_id: null,
        });
      if (error) throw error;
      toast({ title: "Voucher Created", description: `Code: ${code}` });
      resetForm();
      setCreateOpen(false);
      await fetchVouchers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("vouchers").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted", description: "Voucher removed." });
    await fetchVouchers();
  };

  const sendVoucherWhatsApp = (voucher: Voucher) => {
    const discountText = voucher.discount_type === "percentage"
      ? `${voucher.discount_percentage}% Off`
      : `₹${voucher.discount_amount} Off`;

    let conditionsText = "";
    if (voucher.min_order_amount > 0) {
      conditionsText += `\n📋 Minimum order: ₹${voucher.min_order_amount}`;
    }
    if (voucher.max_order_amount > 0) {
      conditionsText += `\n📋 Maximum order: ₹${voucher.max_order_amount}`;
    }

    const msg = `🎟️ *Discount Voucher from Anurag Mobile!*\n\n🎫 Voucher Code: *${voucher.voucher_code}*\n💰 Discount: *${discountText}*${conditionsText}\n\n⚠️ *Note:* This voucher is valid for your *next repair* only.\n\nApply this code on your tracking page:\n${window.location.origin}/track\n\nThank you for choosing Anurag Mobile! 🙏`;

    const phoneInput = prompt("Enter customer phone number (with country code, e.g. 919876543210):");
    if (phoneInput) {
      window.open(getWhatsAppLink(phoneInput, msg), "_blank");
    }
  };

  const filtered = vouchers.filter(
    (v) =>
      v.voucher_code.toLowerCase().includes(search.toLowerCase()) ||
      v.voucher_name.toLowerCase().includes(search.toLowerCase())
  );

  const getDiscountLabel = (v: Voucher) =>
    v.discount_type === "percentage" ? `${v.discount_percentage}%` : `₹${v.discount_amount}`;

  const getConditionsLabel = (v: Voucher) => {
    const parts: string[] = [];
    if (v.min_order_amount > 0) parts.push(`Min: ₹${v.min_order_amount}`);
    if (v.max_order_amount > 0) parts.push(`Max: ₹${v.max_order_amount}`);
    return parts.length > 0 ? parts.join(" • ") : "No conditions";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search vouchers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 gradient-primary hover:opacity-90 rounded-xl font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Create Voucher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                Create New Voucher
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs">Voucher Name (optional)</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Summer Sale, Loyalty Discount"
                  className="rounded-lg mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Discount Type</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as "amount" | "percentage")}>
                  <SelectTrigger className="rounded-lg mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">
                      <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Fixed Amount (₹)</span>
                    </SelectItem>
                    <SelectItem value="percentage">
                      <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> Percentage (%)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {discountType === "amount" ? (
                <div>
                  <Label className="text-xs">Discount Amount (₹)</Label>
                  <Input
                    type="number"
                    value={discountAmount || ""}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    placeholder="e.g. 100"
                    className="rounded-lg mt-1"
                  />
                </div>
              ) : (
                <div>
                  <Label className="text-xs">Discount Percentage (%)</Label>
                  <Input
                    type="number"
                    value={discountPercentage || ""}
                    onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                    placeholder="e.g. 10"
                    min={1}
                    max={100}
                    className="rounded-lg mt-1"
                  />
                </div>
              )}

              {/* Conditions */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                <Label className="text-xs font-semibold text-foreground">📋 Amount Conditions (optional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Min Order (₹)</Label>
                    <Input
                      type="number"
                      value={minAmount || ""}
                      onChange={(e) => setMinAmount(Number(e.target.value))}
                      placeholder="0"
                      className="rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Max Order (₹)</Label>
                    <Input
                      type="number"
                      value={maxAmount || ""}
                      onChange={(e) => setMaxAmount(Number(e.target.value))}
                      placeholder="0 = no limit"
                      className="rounded-lg mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Leave at 0 for no restriction.</p>
              </div>

              <Button
                onClick={handleCreate}
                disabled={creating}
                className="w-full h-11 gradient-primary hover:opacity-90 rounded-xl font-semibold"
              >
                {creating ? "Creating..." : "Create Voucher"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Voucher List */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground animate-pulse">Loading vouchers...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Ticket className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No vouchers found. Create your first one!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((v) => (
            <div key={v.id} className="bg-card rounded-2xl p-4 shadow-card border border-border animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-primary">{v.voucher_code}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      v.is_used ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    }`}>
                      {v.is_used ? "Used" : "Active"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {getDiscountLabel(v)}
                    </span>
                  </div>
                  {v.voucher_name && <p className="text-sm font-medium">{v.voucher_name}</p>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>📋 {getConditionsLabel(v)}</span>
                    {v.tracking_id && <span>🔖 {v.tracking_id}</span>}
                    <span>📅 {new Date(v.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!v.is_used && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs text-success border-success/30 hover:bg-success/10"
                      onClick={() => sendVoucherWhatsApp(v)}
                    >
                      <Send className="w-3 h-3 mr-1" />Send
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => handleDelete(v.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVoucherSection;
