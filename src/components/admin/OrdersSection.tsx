import { useEffect, useMemo, useState } from "react";
import {
  ShoppingBag, Loader2, RefreshCw, Search, Package, MapPin, Phone, CreditCard, Truck,
  CheckCircle2, XCircle, Clock, User, IndianRupee, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  getAllCustomerOrders,
  updateOrderStatus,
  updatePaymentStatus,
  CustomerOrder,
  OrderStatus,
  ORDER_STATUS_LABEL,
} from "@/lib/customerOrderStore";

const STATUS_FILTERS: Array<{ key: "all" | OrderStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "placed", label: "New" },
  { key: "accepted", label: "Accepted" },
  { key: "preparing", label: "Preparing" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const statusColor = (s: OrderStatus) => {
  switch (s) {
    case "placed": return "bg-blue-100 text-blue-700";
    case "accepted": return "bg-indigo-100 text-indigo-700";
    case "preparing": return "bg-amber-100 text-amber-700";
    case "out_for_delivery": return "bg-purple-100 text-purple-700";
    case "delivered": return "bg-green-100 text-green-700";
    case "cancelled": return "bg-red-100 text-red-700";
  }
};

const OrdersSection = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerOrder | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setOrders(await getAllCustomerOrders());
    } catch (e: any) {
      toast({ title: "Failed to load orders", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "all" && o.orderStatus !== filter) return false;
      if (!q) return true;
      return (
        o.orderId.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q)
      );
    });
  }, [orders, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) c[o.orderStatus] = (c[o.orderStatus] || 0) + 1;
    return c;
  }, [orders]);

  const changeStatus = async (o: CustomerOrder, s: OrderStatus) => {
    setSaving(true);
    try {
      await updateOrderStatus(o.id, s);
      toast({ title: `Order ${ORDER_STATUS_LABEL[s]}` });
      await load();
      setSelected((prev) => prev ? { ...prev, orderStatus: s } : prev);
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const changePayment = async (o: CustomerOrder, s: "pending" | "paid") => {
    setSaving(true);
    try {
      await updatePaymentStatus(o.id, s);
      toast({ title: `Payment marked ${s}` });
      await load();
      setSelected((prev) => prev ? { ...prev, paymentStatus: s } : prev);
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Customer Orders</h2>
              <p className="text-xs text-muted-foreground">Online orders placed from the shop</p>
            </div>
          </div>
          <Button onClick={load} variant="outline" size="sm" className="rounded-xl">
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order ID, name, phone..." className="pl-10 h-10 rounded-xl" />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${
                filter === f.key ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"
              }`}
            >
              {f.label} <span className="opacity-70">({counts[f.key] || 0})</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-14 text-center">
          <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No orders found.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Order</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Items</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Payment</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Placed</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(o)}>
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{o.orderId}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.customerName}</div>
                      <div className="text-xs text-muted-foreground">{o.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3">{o.items?.length ?? 0}</td>
                    <td className="px-4 py-3 font-semibold">₹{o.grandTotal.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {o.paymentMethod === "cod" ? <Truck className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                        <span className="text-xs">{o.paymentMethod === "cod" ? "COD" : "Online"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${o.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {o.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColor(o.orderStatus)}`}>
                        {ORDER_STATUS_LABEL[o.orderStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {o.orderStatus === "placed" && (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); changeStatus(o, "accepted"); }} className="h-8 rounded-lg bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accept
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-primary">{selected.orderId}</span>
                  <Badge className={statusColor(selected.orderStatus)}>{ORDER_STATUS_LABEL[selected.orderStatus]}</Badge>
                </SheetTitle>
                <SheetDescription>
                  Placed {new Date(selected.createdAt).toLocaleString("en-IN")}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-4">
                <div className="p-4 rounded-xl border border-border space-y-2">
                  <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-muted-foreground" /> {selected.customerName}</div>
                  <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" /> {selected.customerPhone}</div>
                  {selected.customerEmail && <div className="flex items-center gap-2 text-sm">✉ {selected.customerEmail}</div>}
                  <div className="flex items-start gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground mt-0.5" /> {selected.deliveryAddress}</div>
                </div>

                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="p-3 bg-muted/40 text-xs font-semibold uppercase">Items</div>
                  {selected.items?.map((it) => (
                    <div key={it.id} className="flex justify-between p-3 border-t border-border text-sm">
                      <div>
                        <div className="font-medium">{it.productName}</div>
                        <div className="text-xs text-muted-foreground">{it.productCode} · ₹{it.unitPrice} × {it.quantity}</div>
                      </div>
                      <div className="font-semibold">₹{it.lineTotal.toLocaleString("en-IN")}</div>
                    </div>
                  ))}
                  <div className="p-3 border-t border-border text-sm space-y-1 bg-muted/20">
                    <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{selected.subtotal.toLocaleString("en-IN")}</span></div>
                    {selected.discountAmount > 0 && (
                      <div className="flex justify-between text-green-700"><span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {selected.voucherCode}</span><span>−₹{selected.discountAmount.toLocaleString("en-IN")}</span></div>
                    )}
                    <div className="flex justify-between font-bold pt-1 border-t border-border"><span>Total</span><span className="text-primary">₹{selected.grandTotal.toLocaleString("en-IN")}</span></div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold flex items-center gap-1"><CreditCard className="w-4 h-4" /> Payment</span>
                    <span className="text-xs">{selected.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}</span>
                  </div>
                  <Select value={selected.paymentStatus === "paid" ? "paid" : "pending"} onValueChange={(v) => changePayment(selected, v as any)} disabled={saving}>
                    <SelectTrigger className="rounded-lg h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 rounded-xl border border-border space-y-3">
                  <span className="text-sm font-semibold">Update Order Status</span>
                  <Select value={selected.orderStatus} onValueChange={(v) => changeStatus(selected, v as OrderStatus)} disabled={saving}>
                    <SelectTrigger className="rounded-lg h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["placed","accepted","preparing","out_for_delivery","delivered","cancelled"] as OrderStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => changeStatus(selected, "accepted")} disabled={saving} className="rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accept
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => changeStatus(selected, "out_for_delivery")} disabled={saving} className="rounded-lg">
                      <Truck className="w-3.5 h-3.5 mr-1" /> Dispatch
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => changeStatus(selected, "delivered")} disabled={saving} className="rounded-lg text-green-700 border-green-200">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Delivered
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => changeStatus(selected, "cancelled")} disabled={saving} className="rounded-lg text-destructive border-destructive/30">
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default OrdersSection;
