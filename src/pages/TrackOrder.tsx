import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Package,
  CheckCircle2,
  Truck,
  Bike,
  Home,
  MapPin,
  CreditCard,
  MessageCircle,
  HelpCircle,
  Headphones,
  Search,
  ChevronRight,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Footer from "@/components/Footer";
import logo from "@/assets/logo.png";
import CartIconButton from "@/components/shop/CartIconButton";
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
  payment_status: string;
  order_status: string;
  subtotal: number;
  discount_amount: number;
  grand_total: number;
  voucher_code: string | null;
  created_at: string;
  updated_at: string;
  customer_order_items: OrderItem[];
}

const STEPS = [
  { key: "placed", label: "Order Placed", Icon: CheckCircle2 },
  { key: "shipped", label: "Shipped", Icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", Icon: Bike },
  { key: "delivered", label: "Delivered", Icon: Home },
];

const stepIndexFor = (status: string) => {
  switch (status) {
    case "placed":
    case "confirmed":
    case "packed":
      return 0;
    case "shipped":
      return 1;
    case "out_for_delivery":
      return 2;
    case "delivered":
      return 3;
    default:
      return 0;
  }
};

const STATUS_LABEL: Record<string, string> = {
  placed: "PLACED",
  confirmed: "CONFIRMED",
  packed: "PACKED",
  shipped: "SHIPPED",
  out_for_delivery: "OUT FOR DELIVERY",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
};

const TrackOrder = () => {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(!!orderId);
  const [notFound, setNotFound] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      const { data } = await supabase.rpc("get_customer_order_public", {
        p_order_id: orderId,
      });
      const parsed = (data as unknown) as OrderData | null;
      if (!parsed) setNotFound(true);
      setOrder(parsed);
      setLoading(false);
    };
    if (orderId) load();
  }, [orderId]);

  const cancelled = order?.order_status === "cancelled";
  const activeStep = stepIndexFor(order?.order_status || "placed");
  const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  const fmtDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
      : "";
  const fmtTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";

  const arrival = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const totalItems =
    order?.customer_order_items?.reduce((s, i) => s + Number(i.quantity), 0) || 0;

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(240_20%_97%)]">
      <Helmet>
        <title>Track Your Order – Anurag Mobile</title>
        <meta
          name="description"
          content="Track your Anurag Mobile order status, shipment progress and delivery updates in real time."
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Anurag Mobile" className="w-8 h-8 rounded" />
            <span className="font-display font-bold tracking-wide text-base sm:text-lg">
              ANURAG MOBILE
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-widest text-slate-300">
            <Link to="/order-now" className="hover:text-orange-400">STORE</Link>
            <span className="text-white border-b-2 border-orange-500 pb-0.5">TRACK ORDER</span>
            <Link to="/book-repair" className="hover:text-orange-400">BOOK REPAIR</Link>
          </nav>
          <CartIconButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8 flex-1 w-full">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
          <Link to="/" className="hover:text-orange-600">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/order-now" className="hover:text-orange-600">Orders</Link>
          {orderId && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="font-semibold text-slate-900">Track #{orderId}</span>
            </>
          )}
        </nav>

        {/* Search form (no id / not found) */}
        {(!orderId || notFound) && !loading && (
          <div className="max-w-xl mx-auto bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4">
              {notFound ? <XCircle className="w-7 h-7" /> : <Package className="w-7 h-7" />}
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              {notFound ? "Order not found" : "Track Your Order"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {notFound
                ? `We couldn't find an order with ID "${orderId}". Please check and try again.`
                : "Enter your Order ID (e.g. ORD-2026-0001) to see live status."}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value.toUpperCase())}
                  onKeyDown={(e) =>
                    e.key === "Enter" && query.trim() && navigate(`/track-order/${query.trim()}`)
                  }
                  placeholder="ORD-2026-0001"
                  className="pl-9 h-12 rounded-xl"
                />
              </div>
              <Button
                onClick={() => query.trim() && navigate(`/track-order/${query.trim()}`)}
                className="h-12 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              >
                Track Order
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
          </div>
        )}

        {order && !loading && (
          <>
            {/* Order header card */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 truncate">
                    Order #{order.order_id}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Placed on {fmtDate(order.created_at)} • {totalItems} Items • Total:{" "}
                    {fmt(order.grand_total)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide text-white ${
                    cancelled ? "bg-red-500" : "bg-orange-500"
                  }`}
                >
                  {STATUS_LABEL[order.order_status] || order.order_status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_360px] gap-5 mt-5">
              {/* LEFT */}
              <div className="space-y-5">
                {/* Shipment status */}
                <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
                  <p className="font-display font-bold text-lg mb-8">Shipment Status</p>
                  {cancelled ? (
                    <div className="flex items-center gap-3 text-red-600">
                      <XCircle className="w-6 h-6" />
                      <p className="font-semibold">This order has been cancelled.</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-0 right-0 top-6 h-1 bg-slate-100 rounded-full" />
                      <div
                        className="absolute left-0 top-6 h-1 bg-orange-500 rounded-full transition-all"
                        style={{ width: `${(activeStep / (STEPS.length - 1)) * 100}%` }}
                      />
                      <div className="relative grid grid-cols-4 gap-2">
                        {STEPS.map((s, i) => {
                          const done = i <= activeStep;
                          const current = i === activeStep;
                          return (
                            <div key={s.key} className="flex flex-col items-center text-center">
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-card ${
                                  done
                                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                <s.Icon className="w-5 h-5" />
                              </div>
                              <p
                                className={`mt-2 text-[11px] sm:text-xs font-semibold ${
                                  current
                                    ? "text-orange-600"
                                    : done
                                    ? "text-slate-900"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {s.label}
                              </p>
                              {done && (
                                <p className="text-[10px] text-muted-foreground">
                                  {i === 0 ? fmtTime(order.created_at) : fmtTime(order.updated_at)}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Estimated arrival */}
                {!cancelled && (
                  <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
                          Estimated Arrival
                        </p>
                        <p className="font-display text-xl font-bold">
                          {order.order_status === "delivered" ? "Delivered" : arrival}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/917033067221?text=${encodeURIComponent(
                        `Hi, I want an update on my order #${order.order_id}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold h-11 px-5">
                        <MessageCircle className="w-4 h-4 mr-2" /> Ask for update
                      </Button>
                    </a>
                  </div>
                )}

                {/* Items */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-3">
                    Items in this order
                  </p>
                  <div className="space-y-3">
                    {order.customer_order_items?.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="w-6 h-6 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{it.product_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {it.product_code} · Qty {it.quantity}
                          </p>
                        </div>
                        <p className="font-bold text-orange-600 whitespace-nowrap">
                          {fmt(it.line_total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <aside className="space-y-4 lg:sticky lg:top-24 self-start">
                {/* Summary */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-4">
                    Order Summary
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{fmt(order.subtotal)}</span>
                    </div>
                    {Number(order.discount_amount) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount {order.voucher_code ? `(${order.voucher_code})` : ""}</span>
                        <span>-{fmt(order.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-orange-600 font-semibold">FREE</span>
                    </div>
                  </div>
                  <div className="border-t border-border mt-4 pt-4 flex items-center justify-between">
                    <span className="font-display font-bold">Grand Total</span>
                    <span className="font-display text-2xl font-bold">{fmt(order.grand_total)}</span>
                  </div>
                </div>

                {/* Assistance */}
                <div className="bg-slate-900 text-white rounded-2xl p-5">
                  <p className="font-display text-xl font-bold">Need assistance?</p>
                  <p className="text-sm text-slate-300 mt-2">
                    If you have any questions regarding your delivery or order status, our support
                    team is here to help you.
                  </p>
                  <a
                    href="https://wa.me/917033067221"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-4"
                  >
                    <Button className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                      <Headphones className="w-4 h-4 mr-2" /> Chat Support
                    </Button>
                  </a>
                  <Link to="/order-now" className="block mt-2">
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-xl bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white font-semibold"
                    >
                      <HelpCircle className="w-4 h-4 mr-2" /> Continue Shopping
                    </Button>
                  </Link>
                </div>

                {/* Address & payment */}
                <div className="border border-dashed border-border rounded-2xl p-5 bg-card">
                  <div className="flex gap-3">
                    <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-bold">Shipping Address</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {order.delivery_address}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <CreditCard className="w-4 h-4 text-orange-500 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-bold">Payment Method</p>
                      <p className="text-sm text-muted-foreground">
                        {order.payment_method?.toLowerCase() === "cod"
                          ? "Cash on Delivery"
                          : "Online (Razorpay)"}{" "}
                        · {order.payment_status}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default TrackOrder;
