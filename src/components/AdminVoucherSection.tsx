import { useState, useEffect } from "react";
import {
  Plus, Ticket, Send, Trash2, Search, Percent, IndianRupee,
  Eye, Filter, ChevronDown, Users, Lock, Clock, BarChart3, Sparkles,
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
  voucher_type: string;
  status: string;
  expiry_date: string | null;
  usage_limit: number;
  used_count: number;
}

interface Redemption {
  id: string;
  voucher_id: string;
  order_tracking_id: string;
  customer_name: string;
  customer_phone: string;
  amount_before: number;
  discount_applied: number;
  final_amount: number;
  redeemed_at: string;
}

const AdminVoucherSection = () => {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [redemptionsOpen, setRedemptionsOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percentage">("amount");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [minAmount, setMinAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(0);
  const [voucherType, setVoucherType] = useState<"public" | "private" | "new_customer">("public");
  const [expiryDate, setExpiryDate] = useState("");
  const [usageLimit, setUsageLimit] = useState(1);

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
    setVoucherType("public");
    setExpiryDate("");
    setUsageLimit(1);
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
          voucher_type: voucherType,
          status: "active",
          expiry_date: expiryDate || null,
          usage_limit: voucherType === "private" ? 1 : usageLimit,
          used_count: 0,
        } as any);
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

  const viewRedemptions = async (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setRedemptionsOpen(true);
    setRedemptionsLoading(true);
    const { data, error } = await supabase
      .from("voucher_redemptions")
      .select("*")
      .eq("voucher_id", voucher.id)
      .order("redeemed_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setRedemptions((data as Redemption[]) || []);
    setRedemptionsLoading(false);
  };

  const sendVoucherWhatsApp = (voucher: Voucher) => {
    const discountText = voucher.discount_type === "percentage"
      ? `${voucher.discount_percentage}% Off`
      : `₹${voucher.discount_amount} Off`;

    let conditionsText = "";
    if (voucher.min_order_amount > 0) conditionsText += `\n📋 Minimum order: ₹${voucher.min_order_amount}`;
    if (voucher.max_order_amount > 0) conditionsText += `\n📋 Maximum order: ₹${voucher.max_order_amount}`;
    if (voucher.expiry_date) conditionsText += `\n⏰ Valid till: ${new Date(voucher.expiry_date).toLocaleDateString("en-IN")}`;

    const msg = `🎟️ *Discount Voucher from Anurag Mobile!*\n\n🎫 Voucher Code: *${voucher.voucher_code}*\n💰 Discount: *${discountText}*${conditionsText}\n\nApply this code on your tracking page:\n${window.location.origin}/track\n\nThank you for choosing Anurag Mobile! 🙏`;

    const phoneInput = prompt("Enter customer phone number (with country code, e.g. 919876543210):");
    if (phoneInput) {
      window.open(getWhatsAppLink(phoneInput, msg), "_blank");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success/10 text-success";
      case "exhausted": return "bg-muted text-muted-foreground";
      case "expired": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const computeStatus = (v: Voucher): string => {
    if (v.expiry_date && new Date(v.expiry_date) < new Date()) return "expired";
    if (v.usage_limit > 0 && v.used_count >= v.usage_limit) return "exhausted";
    return v.status === "active" ? "active" : v.status;
  };

  const filtered = vouchers.filter((v) => {
    const matchesSearch = v.voucher_code.toLowerCase().includes(search.toLowerCase()) ||
      v.voucher_name.toLowerCase().includes(search.toLowerCase());
    const computed = computeStatus(v);
    const matchesStatus = statusFilter === "all" || computed === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-11 rounded-xl">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="exhausted">Exhausted</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 gradient-primary hover:opacity-90 rounded-xl font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Create Voucher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                Create New Voucher
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs">Voucher Name (optional)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Sale" className="rounded-lg mt-1" />
              </div>

              {/* Voucher Type */}
              <div>
                <Label className="text-xs">Voucher Type</Label>
                <Select value={voucherType} onValueChange={(v) => setVoucherType(v as "public" | "private" | "new_customer")}>
                  <SelectTrigger className="rounded-lg mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Public (Anyone can use)</span>
                    </SelectItem>
                    <SelectItem value="private">
                      <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Private (Single use)</span>
                    </SelectItem>
                    <SelectItem value="new_customer">
                      <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> New Customers Only (First repair)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Discount Type</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as "amount" | "percentage")}>
                  <SelectTrigger className="rounded-lg mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount"><span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Fixed Amount (₹)</span></SelectItem>
                    <SelectItem value="percentage"><span className="flex items-center gap-1"><Percent className="w-3 h-3" /> Percentage (%)</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {discountType === "amount" ? (
                <div>
                  <Label className="text-xs">Discount Amount (₹)</Label>
                  <Input type="number" value={discountAmount || ""} onChange={(e) => setDiscountAmount(Number(e.target.value))} placeholder="e.g. 100" className="rounded-lg mt-1" />
                </div>
              ) : (
                <div>
                  <Label className="text-xs">Discount Percentage (%)</Label>
                  <Input type="number" value={discountPercentage || ""} onChange={(e) => setDiscountPercentage(Number(e.target.value))} placeholder="e.g. 10" min={1} max={100} className="rounded-lg mt-1" />
                </div>
              )}

              {/* Expiry Date */}
              <div>
                <Label className="text-xs">Expiry Date (optional)</Label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="rounded-lg mt-1" />
              </div>

              {/* Usage Limit - only for public */}
              {voucherType !== "private" && (
                <div>
                  <Label className="text-xs">Usage Limit (0 = unlimited)</Label>
                  <Input type="number" value={usageLimit} onChange={(e) => setUsageLimit(Number(e.target.value))} placeholder="e.g. 50" className="rounded-lg mt-1" />
                </div>
              )}

              {/* Conditions */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                <Label className="text-xs font-semibold text-foreground">📋 Amount Conditions (optional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Min Order (₹)</Label>
                    <Input type="number" value={minAmount || ""} onChange={(e) => setMinAmount(Number(e.target.value))} placeholder="0" className="rounded-lg mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Max Order (₹)</Label>
                    <Input type="number" value={maxAmount || ""} onChange={(e) => setMaxAmount(Number(e.target.value))} placeholder="0 = no limit" className="rounded-lg mt-1" />
                  </div>
                </div>
              </div>

              <Button onClick={handleCreate} disabled={creating} className="w-full h-11 gradient-primary hover:opacity-90 rounded-xl font-semibold">
                {creating ? "Creating..." : "Create Voucher"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Redemptions Modal */}
      <Dialog open={redemptionsOpen} onOpenChange={setRedemptionsOpen}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Redemption History — {selectedVoucher?.voucher_code}
            </DialogTitle>
          </DialogHeader>
          {selectedVoucher && (
            <div className="mb-3 p-3 rounded-xl bg-muted/50 text-sm">
              <span className="font-semibold">Used: {selectedVoucher.used_count}</span>
              {selectedVoucher.usage_limit > 0 && <span> / {selectedVoucher.usage_limit}</span>}
            </div>
          )}
          {redemptionsLoading ? (
            <p className="text-center py-6 text-muted-foreground animate-pulse">Loading...</p>
          ) : redemptions.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No redemptions yet.</p>
          ) : (
            <div className="space-y-3">
              {redemptions.map((r) => (
                <div key={r.id} className="p-3 bg-card rounded-xl border border-border text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">{r.customer_name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.redeemed_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>📞 {r.customer_phone}</span>
                    <span>🔖 {r.order_tracking_id}</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span>Before: ₹{r.amount_before}</span>
                    <span className="text-success font-semibold">-₹{r.discount_applied}</span>
                    <span className="font-bold">Final: ₹{r.final_amount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Voucher List */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground animate-pulse">Loading vouchers...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Ticket className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No vouchers found.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((v) => {
            const computed = computeStatus(v);
            return (
              <div key={v.id} className="bg-card rounded-2xl p-4 shadow-card border border-border animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono font-bold text-primary">{v.voucher_code}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(computed)}`}>
                        {computed.charAt(0).toUpperCase() + computed.slice(1)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {getDiscountLabel(v)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.voucher_type === "public" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"}`}>
                        {v.voucher_type === "public" ? <><Users className="w-3 h-3 inline mr-1" />Public</> : <><Lock className="w-3 h-3 inline mr-1" />Private</>}
                      </span>
                    </div>
                    {v.voucher_name && <p className="text-sm font-medium">{v.voucher_name}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span>📋 {getConditionsLabel(v)}</span>
                      <span>📊 Used: {v.used_count}{v.usage_limit > 0 ? ` / ${v.usage_limit}` : " / ∞"}</span>
                      {v.expiry_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expires: {new Date(v.expiry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      )}
                      <span>📅 {new Date(v.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => viewRedemptions(v)}>
                      <Eye className="w-3 h-3 mr-1" />Redemptions
                    </Button>
                    {computed === "active" && (
                      <Button size="sm" variant="outline" className="rounded-lg text-xs text-success border-success/30 hover:bg-success/10" onClick={() => sendVoucherWhatsApp(v)}>
                        <Send className="w-3 h-3 mr-1" />Send
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="rounded-lg text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDelete(v.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminVoucherSection;
