import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle2,
  Truck,
  MapPin,
  ShieldCheck,
  Mail,
  Receipt,
  MessageCircle,
  Package,
  Headphones,
  Phone,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";

interface OrderItem {
  product_code: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

interface OrderData {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  payment_method: string;
  grand_total: number;
  customer_order_items: OrderItem[];
}

const OrderSuccess = () => {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { paymentMethod?: string } };
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc("get_customer_order_public", { p_order_id: orderId });
      setOrder((data as unknown) as OrderData | null);
      setLoading(false);
    };
    if (orderId) load();
    else setLoading(false);
  }, [orderId]);

  const arrival = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const payMethod = (location.state?.paymentMethod || order?.payment_method || "").toLowerCase();
  const payLabel = payMethod === "cod" ? "Cash on Delivery" : "Online (Razorpay)";

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(240_20%_97%)]">
      <Helmet>
        <title>Order Placed – Anurag Mobile</title>
        <meta name="description" content="Your order has been placed successfully." />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Anurag Mobile" className="w-8 h-8 rounded" />
            <span className="font-display font-bold text-lg">Anurag Mobile</span>
          </Link>
          <Link to="/order-now" className="text-sm text-slate-200 hover:text-orange-400">
            Continue shopping
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-14 flex-1">
        {/* Success hero */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center mb-5">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-slate-900">
            Order Placed Successfully!
          </h1>
          <p className="text-muted-foreground mt-3">
            We've received your order and are getting it ready.{" "}
            <span className="font-semibold text-slate-800">We will update you via WhatsApp.</span>
          </p>
          <div className="inline-block mt-5 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-sm">
            <span className="text-slate-600">Order ID:</span>{" "}
            <span className="font-mono font-bold text-slate-900">#{orderId}</span>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground mt-10">Loading order details…</p>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-5 mt-10 max-w-6xl mx-auto">
            {/* LEFT */}
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Arrival */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Estimated Arrival
                      </p>
                      <p className="font-display font-bold text-lg mt-1">{arrival}</p>
                      <p className="text-xs text-muted-foreground">Standard Delivery</p>
                    </div>
                  </div>
                </div>

                {/* Shipping */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Shipping To
                      </p>
                      <p className="font-display font-bold text-lg mt-1 truncate">
                        {order?.customer_name || "Customer"}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {order?.delivery_address}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items summary */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm">
                <div className="space-y-3">
                  {order?.customer_order_items?.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shrink-0">
                        <Package className="w-7 h-7 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-orange-400 font-bold">
                          {it.product_code}
                        </p>
                        <p className="font-bold truncate">{it.product_name}</p>
                        <p className="text-xs text-slate-400">Qty: {it.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">
                          Amount
                        </p>
                        <p className="font-display font-bold text-orange-400">
                          ₹{Number(it.line_total).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-700 mt-4 pt-4 flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Total Amount Paid</span>
                  <span className="font-display text-2xl font-bold text-orange-400">
                    ₹{Number(order?.grand_total || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 text-right">via {payLabel}</p>
              </div>

              {/* Quality guarantee */}
              <div className="bg-blue-50/60 border border-dashed border-blue-200 rounded-2xl p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold">Anurag Mobile Quality Guarantee</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Every purchase includes a manufacturer warranty and priority technical support
                    from our team.
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <aside className="space-y-4 lg:sticky lg:top-24 self-start">
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-5">
                <p className="font-display font-bold mb-4">What's Next?</p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Receipt className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Preparation</p>
                      <p className="text-xs text-muted-foreground">
                        We're verifying your payment and packing your items.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">WhatsApp Updates</p>
                      <p className="text-xs text-muted-foreground">
                        You'll receive shipping and delivery updates on WhatsApp.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => navigate("/order-now")}
                  variant="outline"
                  className="w-full mt-5 rounded-xl border-slate-300 font-semibold"
                >
                  Continue Shopping <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              <div className="bg-slate-900 text-white rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Headphones className="w-5 h-5 text-orange-400" />
                  <p className="font-bold">Need Help?</p>
                </div>
                <p className="text-sm text-slate-300">
                  Our team is available to assist you with your order.
                </p>
                <a
                  href="https://wa.me/917033067221"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 text-sm text-slate-100 hover:text-orange-400"
                >
                  <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
                </a>
                <a
                  href="tel:+917033067221"
                  className="mt-2 flex items-center gap-2 text-sm text-slate-100 hover:text-orange-400"
                >
                  <Phone className="w-4 h-4" /> +91 70330 67221
                </a>
              </div>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default OrderSuccess;
