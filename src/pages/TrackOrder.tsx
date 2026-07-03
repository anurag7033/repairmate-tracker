import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, Package, CheckCircle2, Clock, Loader2, Truck, XCircle, MapPin, CreditCard, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getCustomerOrderByOrderId,
  CustomerOrder,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_SEQUENCE,
} from "@/lib/customerOrderStore";
import Footer from "@/components/Footer";
import logo from "@/assets/logo.png";

const TrackOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(orderId || "");
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) fetchOrder(orderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const fetchOrder = async (id: string) => {
    setLoading(true); setError(null); setOrder(null);
    try {
      const o = await getCustomerOrderByOrderId(id.trim());
      if (!o) setError("Order not found. Check the ID and try again.");
      else setOrder(o);
    } catch (e: any) {
      setError(e.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/track-order/${query.trim().toUpperCase()}`);
  };

  const currentStepIndex = order && order.orderStatus !== "cancelled"
    ? ORDER_STATUS_SEQUENCE.indexOf(order.orderStatus)
    : -1;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900">
      <Helmet><title>Track Order — Anurag Mobile</title></Helmet>
      <header className="border-b border-white/10 bg-blue-950/70 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between py-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white">
            <img src={logo} alt="" className="w-9 h-9 rounded-lg" />
            <div>
              <div className="font-display font-bold text-sm leading-tight">Anurag Mobile</div>
              <div className="text-[10px] text-white/60 leading-tight">Track your order</div>
            </div>
          </button>
          <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-white/10" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Home
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 shadow-elevated">
            <h1 className="font-display text-2xl font-bold text-white mb-1 text-center">Track Your Order</h1>
            <p className="text-white/70 text-sm text-center mb-5">Enter your order ID (e.g. ORD-2026-0001)</p>
            <form onSubmit={onSearch} className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                placeholder="ORD-XXXX-XXXX"
                className="h-11 rounded-xl bg-white font-mono"
              />
              <Button type="submit" className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 px-6">
                <Search className="w-4 h-4 mr-1" /> Track
              </Button>
            </form>
          </div>

          {loading && (
            <div className="flex justify-center py-12 text-white/80"><Loader2 className="w-6 h-6 animate-spin" /></div>
          )}

          {error && (
            <div className="mt-6 bg-white/10 border border-red-400/30 rounded-2xl p-6 text-center text-white">
              <XCircle className="w-10 h-10 mx-auto mb-2 text-red-300" />
              <p>{error}</p>
            </div>
          )}

          {order && (
            <div className="mt-6 space-y-4">
              <div className="bg-white rounded-3xl p-6 shadow-elevated">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Order</p>
                    <p className="font-mono font-bold text-lg text-primary">{order.orderId}</p>
                  </div>
                  {order.orderStatus === "cancelled" ? (
                    <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Cancelled</span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold capitalize">
                      {ORDER_STATUS_LABEL[order.orderStatus]}
                    </span>
                  )}
                </div>

                {order.orderStatus !== "cancelled" && (
                  <div className="space-y-3">
                    {ORDER_STATUS_SEQUENCE.map((s, i) => {
                      const done = i <= currentStepIndex;
                      const current = i === currentStepIndex;
                      return (
                        <div key={s} className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${
                            done ? "bg-green-500 border-green-500 text-white" : "bg-white border-border text-muted-foreground"
                          } ${current ? "ring-4 ring-green-200" : ""}`}>
                            {done ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <div className={`font-semibold text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>
                              {ORDER_STATUS_LABEL[s]}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-elevated space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><MapPin className="w-3.5 h-3.5" /> Delivery Address</div>
                  <div className="text-sm">{order.deliveryAddress}</div>
                  <div className="text-xs text-muted-foreground">{order.customerName} · {order.customerPhone}</div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span>{order.paymentMethod === "cod" ? "COD" : "Online"}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>
                <div className="border-t border-border pt-3 space-y-2">
                  {order.items?.map((it) => (
                    <div key={it.id} className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span>{it.productName} × {it.quantity}</span>
                      </div>
                      <span className="font-semibold">₹{it.lineTotal.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-700"><span>Discount</span><span>−₹{order.discountAmount.toLocaleString("en-IN")}</span></div>
                  )}
                  <div className="flex justify-between font-bold pt-2 border-t border-border">
                    <span>Total</span><span className="text-primary">₹{order.grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TrackOrder;
