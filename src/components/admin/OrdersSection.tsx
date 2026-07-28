import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, MessageCircle, Package, MapPin, Phone, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CustomerOrderItem {
  id: string;
  product_code: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

interface CustomerOrder {
  id: string;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_address: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  subtotal: number;
  discount_amount: number;
  grand_total: number;
  voucher_code: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  customer_order_items: CustomerOrderItem[];
}

const ORDER_STATUSES = [
  { value: "placed", label: "Placed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const PAYMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
] as const;

const statusColor = (s: string) => {
  switch (s) {
    case "placed": return "bg-slate-100 text-slate-700 border-slate-200";
    case "confirmed": return "bg-blue-100 text-blue-700 border-blue-200";
    case "packed": return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "shipped": return "bg-amber-100 text-amber-700 border-amber-200";
    case "out_for_delivery": return "bg-orange-100 text-orange-700 border-orange-200";
    case "delivered": return "bg-green-100 text-green-700 border-green-200";
    case "cancelled": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const paymentColor = (s: string) => {
  switch (s) {
    case "paid": return "bg-green-100 text-green-700 border-green-200";
    case "pending": return "bg-amber-100 text-amber-700 border-amber-200";
    case "failed": return "bg-red-100 text-red-700 border-red-200";
    case "refunded": return "bg-slate-100 text-slate-700 border-slate-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const OrdersSection = () => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customer_orders")
      .select("*, customer_order_items(*)")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setOrders((data ?? []) as unknown as CustomerOrder[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.order_status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        o.order_id.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const updateStatus = async (id: string, field: "order_status" | "payment_status", value: string) => {
    const { error } = await supabase
      .from("customer_orders")
      .update({ [field]: value })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Order updated");
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
  };

  const sendWhatsApp = (o: CustomerOrder) => {
    const phone = o.customer_phone.replace(/\D/g, "").slice(-10);
    const status = ORDER_STATUSES.find((s) => s.value === o.order_status)?.label || o.order_status;
    const msg =
      `Hi ${o.customer_name.split(" ")[0]},\n\n` +
      `Your Anurag Mobile order *#${o.order_id}* is now *${status}*.\n` +
      `Total: ₹${Number(o.grand_total).toLocaleString("en-IN")}\n\n` +
      `We'll keep you updated on WhatsApp. Thanks for shopping with us!`;
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order ID, name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-56 h-11 rounded-xl">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={load} className="h-11 rounded-xl">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No customer orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <Collapsible key={o.id} className="border border-border rounded-2xl bg-card shadow-sm">
              <div className="p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-orange-600">#{o.order_id}</span>
                      <Badge className={`${statusColor(o.order_status)} border font-semibold`} variant="outline">
                        {ORDER_STATUSES.find((s) => s.value === o.order_status)?.label || o.order_status}
                      </Badge>
                      <Badge className={`${paymentColor(o.payment_status)} border font-semibold`} variant="outline">
                        {o.payment_method?.toUpperCase()} · {PAYMENT_STATUSES.find((s) => s.value === o.payment_status)?.label || o.payment_status}
                      </Badge>
                    </div>
                    <p className="font-semibold mt-2">{o.customer_name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {o.customer_phone}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(o.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Grand Total</p>
                    <p className="font-display font-bold text-xl text-slate-900">
                      ₹{Number(o.grand_total).toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-muted-foreground">{o.customer_order_items?.length || 0} item(s)</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
                  <Select value={o.order_status} onValueChange={(v) => updateStatus(o.id, "order_status", v)}>
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={o.payment_status} onValueChange={(v) => updateStatus(o.id, "payment_status", v)}>
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>Payment: {s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => sendWhatsApp(o)} className="h-10 rounded-lg text-green-700 border-green-200 hover:bg-green-50">
                    <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp Update
                  </Button>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="h-10 rounded-lg group">
                      <ChevronDown className="w-4 h-4 mr-1.5 transition-transform group-data-[state=open]:rotate-180" />
                      View Items & Address
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent>
                <div className="border-t border-border p-4 md:p-5 grid md:grid-cols-[1fr_260px] gap-5 bg-muted/20 rounded-b-2xl">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Items ({o.customer_order_items?.length || 0})
                    </p>
                    <div className="space-y-2">
                      {o.customer_order_items?.map((it) => (
                        <div key={it.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2 text-sm">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{it.product_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{it.product_code} · Qty {it.quantity} × ₹{Number(it.unit_price).toLocaleString("en-IN")}</p>
                          </div>
                          <p className="font-bold text-orange-600 whitespace-nowrap ml-3">
                            ₹{Number(it.line_total).toLocaleString("en-IN")}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{Number(o.subtotal).toLocaleString("en-IN")}</span></div>
                      {Number(o.discount_amount) > 0 && (
                        <div className="flex justify-between text-green-700">
                          <span>Discount {o.voucher_code ? `(${o.voucher_code})` : ""}</span>
                          <span>-₹{Number(o.discount_amount).toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold pt-1 border-t border-border"><span>Grand Total</span><span>₹{Number(o.grand_total).toLocaleString("en-IN")}</span></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Delivery Address
                    </p>
                    <div className="bg-card border border-border rounded-lg p-3 text-sm">
                      <p className="font-semibold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" /> {o.customer_name}
                      </p>
                      <p className="text-muted-foreground mt-1 whitespace-pre-line">{o.delivery_address}</p>
                      <p className="text-muted-foreground mt-1">📞 {o.customer_phone}</p>
                      {o.customer_email && (
                        <p className="text-muted-foreground">✉ {o.customer_email}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersSection;
