import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Copy, Package, MapPin, CreditCard, Truck, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCustomerOrderByOrderId, CustomerOrder } from "@/lib/customerOrderStore";
import Footer from "@/components/Footer";

const OrderSuccess = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const o = await getCustomerOrderByOrderId(orderId);
        setOrder(o);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  const copyId = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    toast({ title: "Order ID copied" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <Helmet><title>Order Placed — Anurag Mobile</title></Helmet>
      <main className="flex-1 container mx-auto py-10 px-4 flex items-center justify-center">
        {loading ? (
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        ) : !order ? (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Order not found.</p>
            <Button onClick={() => navigate("/")}>Back to Home</Button>
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-card rounded-3xl shadow-elevated border border-border overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-4">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-1">Order Placed!</h1>
              <p className="text-white/90">Thanks {order.customerName.split(" ")[0]}, we've received your order.</p>
            </div>

            <div className="p-6 space-y-5">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Your Order ID</p>
                <div className="inline-flex items-center gap-2 bg-orange-50 border-2 border-orange-500 rounded-xl px-5 py-3">
                  <span className="font-mono font-bold text-xl text-orange-600">{order.orderId}</span>
                  <button onClick={copyId} className="text-orange-500 hover:text-orange-700">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Save this ID to track your order.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-muted/40">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                    {order.paymentMethod === "cod" ? <Truck className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                    Payment
                  </div>
                  <div className="font-semibold">{order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}</div>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><Package className="w-3.5 h-3.5" /> Status</div>
                  <div className="font-semibold capitalize">{order.orderStatus.replace(/_/g, " ")}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2"><MapPin className="w-3.5 h-3.5" /> Delivery Address</div>
                <div className="text-sm">{order.deliveryAddress}</div>
                <div className="text-xs text-muted-foreground mt-1">{order.customerPhone}</div>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <div className="p-3 bg-muted/40 text-xs font-semibold uppercase tracking-wide">Items</div>
                {order.items?.map((it) => (
                  <div key={it.id} className="flex justify-between p-3 border-t border-border text-sm">
                    <div>
                      <div className="font-medium">{it.productName}</div>
                      <div className="text-xs text-muted-foreground">{it.productCode} × {it.quantity}</div>
                    </div>
                    <div className="font-semibold">₹{it.lineTotal.toLocaleString("en-IN")}</div>
                  </div>
                ))}
                <div className="p-3 border-t border-border text-sm space-y-1">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{order.subtotal.toLocaleString("en-IN")}</span></div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-green-700"><span>Discount ({order.voucherCode})</span><span>−₹{order.discountAmount.toLocaleString("en-IN")}</span></div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-border"><span>Total</span><span className="text-primary">₹{order.grandTotal.toLocaleString("en-IN")}</span></div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="flex-1 h-11 rounded-xl bg-orange-500 hover:bg-orange-600">
                  <Link to={`/track-order/${order.orderId}`}>Track Order <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 h-11 rounded-xl">
                  <Link to="/shop">Continue Shopping</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default OrderSuccess;
