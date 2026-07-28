import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  MapPin,
  Truck,
  CreditCard,
  Wallet,
  Loader2,
  LocateFixed,
  ShieldCheck,
  Package,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Footer from "@/components/Footer";
import logo from "@/assets/logo.png";
import CartIconButton from "@/components/shop/CartIconButton";
import { useCart, clearCart } from "@/lib/cartStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TAX_RATE = 0.08;

type PayMethod = "razorpay" | "cod";

interface Address {
  name: string;
  phone: string;
  email: string;
  addressLine: string;
  city: string;
  pincode: string;
}

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

const Checkout = () => {
  const cart = useCart();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { discountAmount?: number; voucherCode?: string; voucherLabel?: string };
  };

  const [addr, setAddr] = useState<Address>({
    name: "",
    phone: "",
    email: "",
    addressLine: "",
    city: "",
    pincode: "",
  });
  const [method, setMethod] = useState<PayMethod>("razorpay");
  const [locating, setLocating] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.price * c.quantity, 0), [cart]);
  // Voucher discount only applies to online payments
  const rawDiscount = Math.max(0, Number(location.state?.discountAmount || 0));
  const discount = method === "razorpay" ? Math.min(rawDiscount, subtotal) : 0;
  const taxableBase = Math.max(0, subtotal - discount);
  const tax = Math.round(taxableBase * TAX_RATE);
  const grandTotal = Math.max(0, taxableBase + tax);

  useEffect(() => {
    if (cart.length === 0 && !successOrderId) {
      // Nothing to checkout — send back to cart
      navigate("/cart", { replace: true });
    }
  }, [cart.length, successOrderId, navigate]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const a = data.address || {};
          const city = a.city || a.town || a.village || a.suburb || a.county || "";
          const pincode = a.postcode || "";
          setAddr((prev) => ({
            ...prev,
            addressLine: data.display_name || prev.addressLine,
            city: city || prev.city,
            pincode: pincode || prev.pincode,
          }));
          toast.success("Location detected");
        } catch {
          toast.error("Couldn't fetch address for your location");
        } finally {
          setLocating(false);
        }
      },
      () => {
        toast.error("Couldn't get your location — please allow permission");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validate = (): string | null => {
    if (!addr.name.trim()) return "Please enter your full name";
    if (!/^\+?\d{10,15}$/.test(addr.phone.replace(/\s/g, ""))) return "Enter a valid phone number";
    if (!addr.addressLine.trim()) return "Please enter your delivery address";
    if (!addr.city.trim()) return "Please enter your city";
    if (!/^\d{5,6}$/.test(addr.pincode.trim())) return "Please enter a valid pincode";
    return null;
  };

  const fullAddress = () =>
    `${addr.addressLine}, ${addr.city} - ${addr.pincode}`.trim();

  const itemsPayload = () =>
    cart.map((c) => ({
      productId: c.productId,
      productCode: c.productCode,
      productName: c.name,
      unitPrice: c.price,
      quantity: c.quantity,
    }));

  const placeCodOrder = async () => {
    const { data, error } = await supabase.rpc("place_customer_order_public", {
      p_customer_name: addr.name.trim(),
      p_customer_phone: addr.phone.trim(),
      p_customer_email: addr.email.trim() || "",
      p_delivery_address: fullAddress(),
      p_discount_amount: 0,
      p_items: itemsPayload() as unknown as never,
      p_payment_method: "cod",
      p_voucher_code: "",
      p_voucher_id: "",
    });
    if (error) throw new Error(error.message);
    const result = (data ?? {}) as { order_id?: string; orderId?: string };
    return result.order_id || result.orderId || "";
  };

  const placeRazorpayOrder = async () => {
    // 1) create a Razorpay order server-side
    const createRes = await supabase.functions.invoke("create-shop-razorpay-order", {
      body: {
        amount: grandTotal,
        customerName: addr.name.trim(),
        customerPhone: addr.phone.trim(),
      },
    });
    if (createRes.error || !createRes.data?.razorpayOrderId) {
      throw new Error(createRes.error?.message || "Couldn't start payment");
    }
    const { razorpayOrderId, amount, currency, keyId } = createRes.data as {
      razorpayOrderId: string;
      amount: number;
      currency: string;
      keyId: string;
    };

    // 2) load and open Razorpay checkout
    const ok = await loadRazorpay();
    if (!ok) throw new Error("Failed to load payment gateway");

    return await new Promise<string>((resolve, reject) => {
      const rzp = new (window as any).Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: razorpayOrderId,
        name: "Anurag Mobile",
        description: "Order Payment",
        prefill: {
          name: addr.name,
          contact: addr.phone,
          email: addr.email || undefined,
        },
        theme: { color: "#f97316" },
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled")),
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await supabase.functions.invoke(
              "verify-shop-payment-and-place-order",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderPayload: {
                    customerName: addr.name.trim(),
                    customerPhone: addr.phone.trim(),
                    customerEmail: addr.email.trim() || null,
                    deliveryAddress: fullAddress(),
                    items: itemsPayload(),
                    discountAmount: discount,
                    voucherId: null,
                    voucherCode: location.state?.voucherCode || null,
                  },
                },
              }
            );
            if (verifyRes.error || !verifyRes.data?.orderId) {
              reject(new Error(verifyRes.error?.message || "Payment verification failed"));
              return;
            }
            resolve(verifyRes.data.orderId as string);
          } catch (e: any) {
            reject(new Error(e?.message || "Payment verification failed"));
          }
        },
      });
      rzp.on("payment.failed", (resp: any) => {
        reject(new Error(resp?.error?.description || "Payment failed"));
      });
      rzp.open();
    });
  };

  const handlePlaceOrder = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    if (cart.length === 0) return;

    setPlacing(true);
    try {
      const orderId =
        method === "razorpay" ? await placeRazorpayOrder() : await placeCodOrder();
      if (!orderId) throw new Error("Could not create order");
      setSuccessOrderId(orderId);
      clearCart();
    } catch (e: any) {
      toast.error(e?.message || "Order failed");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(240_20%_97%)]">
      <Helmet>
        <title>Checkout – Anurag Mobile</title>
        <meta name="description" content="Complete your Anurag Mobile order with secure checkout." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <ShopHeader />

      <main className="container mx-auto py-6 md:py-10 flex-1">
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
          {/* Left column */}
          <div className="space-y-5">
            {/* Shipping Address */}
            <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  <h2 className="font-display text-lg md:text-xl font-bold">Shipping Address</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={useMyLocation}
                  disabled={locating}
                  className="rounded-lg text-orange-600 border-orange-200 hover:bg-orange-50 font-semibold"
                >
                  {locating ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <LocateFixed className="w-4 h-4 mr-1.5" />
                  )}
                  Use current location
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="name" label="Full name">
                  <Input
                    id="name"
                    value={addr.name}
                    onChange={(e) => setAddr({ ...addr, name: e.target.value })}
                    placeholder="Anurag Sharma"
                    className="h-11 rounded-xl"
                  />
                </Field>
                <Field id="phone" label="Mobile number">
                  <Input
                    id="phone"
                    inputMode="tel"
                    value={addr.phone}
                    onChange={(e) => setAddr({ ...addr, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="h-11 rounded-xl"
                  />
                </Field>
                <Field id="email" label="Email (optional)" className="sm:col-span-2">
                  <Input
                    id="email"
                    type="email"
                    value={addr.email}
                    onChange={(e) => setAddr({ ...addr, email: e.target.value })}
                    placeholder="you@example.com"
                    className="h-11 rounded-xl"
                  />
                </Field>
                <Field id="addressLine" label="Address (house, street, area)" className="sm:col-span-2">
                  <Textarea
                    id="addressLine"
                    value={addr.addressLine}
                    onChange={(e) => setAddr({ ...addr, addressLine: e.target.value })}
                    placeholder="45/B Tech Park, Innovation Hub"
                    className="min-h-[80px] rounded-xl"
                  />
                </Field>
                <Field id="city" label="City">
                  <Input
                    id="city"
                    value={addr.city}
                    onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                    placeholder="Bangalore"
                    className="h-11 rounded-xl"
                  />
                </Field>
                <Field id="pincode" label="Pincode">
                  <Input
                    id="pincode"
                    inputMode="numeric"
                    value={addr.pincode}
                    onChange={(e) => setAddr({ ...addr, pincode: e.target.value })}
                    placeholder="560001"
                    className="h-11 rounded-xl"
                  />
                </Field>
              </div>
            </section>

            {/* Delivery method */}
            <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-orange-500" />
                <h2 className="font-display text-lg md:text-xl font-bold">Delivery Method</h2>
              </div>
              <div className="border-2 border-orange-500 bg-orange-50/50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold">Standard Delivery</p>
                  <p className="text-xs text-muted-foreground">3–5 Business Days</p>
                </div>
                <span className="font-bold text-orange-600">Free</span>
              </div>
            </section>

            {/* Payment method */}
            <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-orange-500" />
                <h2 className="font-display text-lg md:text-xl font-bold">Payment Method</h2>
              </div>
              <div className="space-y-3">
                <PayOption
                  active={method === "razorpay"}
                  onClick={() => setMethod("razorpay")}
                  icon={<CreditCard className="w-5 h-5" />}
                  title="Razorpay Gateway"
                  subtitle="PhonePe, GPay, Paytm, Credit Card, Debit Card — instant & secure"
                />
                <PayOption
                  active={method === "cod"}
                  onClick={() => setMethod("cod")}
                  icon={<Wallet className="w-5 h-5" />}
                  title="Cash on Delivery"
                  subtitle="Pay when you receive your order"
                />
                {location.state?.voucherCode && method !== "razorpay" && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Voucher <span className="font-bold">{location.state.voucherCode}</span> applies
                    only on online payments.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Right column: summary */}
          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h2 className="font-display text-xl font-bold pb-3 border-b border-border">
                Order Summary
              </h2>

              <ul className="mt-4 space-y-3 max-h-56 overflow-auto pr-1">
                {cart.map((c) => (
                  <li key={c.productId} className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-muted/40 border border-border overflow-hidden flex items-center justify-center shrink-0">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt={c.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight line-clamp-2">{c.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {c.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-orange-600 whitespace-nowrap">
                      ₹{(c.price * c.quantity).toLocaleString("en-IN")}
                    </p>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-2 text-sm border-t border-border pt-4">
                <Row label="Subtotal" value={`₹${subtotal.toLocaleString("en-IN")}`} />
                <Row label="Shipping" value="FREE" valueClass="text-green-600 font-bold" />
                <Row label="Estimated Tax (8%)" value={`₹${tax.toLocaleString("en-IN")}`} />
                {discount > 0 && (
                  <Row
                    label={`Discount (${location.state?.voucherCode})`}
                    value={`-₹${discount.toLocaleString("en-IN")}`}
                    valueClass="text-green-600 font-semibold"
                  />
                )}
              </dl>

              <div className="border-t border-border mt-4 pt-4 flex items-baseline justify-between">
                <span className="font-display text-lg font-bold">Grand Total</span>
                <span className="font-display text-2xl font-bold text-orange-600">
                  ₹{grandTotal.toLocaleString("en-IN")}
                </span>
              </div>

              <Button
                onClick={handlePlaceOrder}
                disabled={placing || cart.length === 0}
                className="w-full h-12 mt-5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-base tracking-wide"
              >
                {placing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {method === "razorpay" ? "Opening gateway..." : "Placing order..."}
                  </>
                ) : (
                  "Place Order"
                )}
              </Button>
            </div>

            <div className="rounded-2xl bg-blue-50/60 border border-blue-100 p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900">
                Secure SSL Encrypted Checkout. Your privacy and security are our priority.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <Footer />

      <Dialog open={!!successOrderId} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-center font-display text-2xl">
              Order placed successfully!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Your order reference</p>
            <p className="font-mono text-lg font-bold text-orange-600">{successOrderId}</p>
            <p className="text-xs text-muted-foreground pt-2">
              We'll contact you shortly to confirm delivery.
            </p>
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button
              onClick={() => navigate("/order-now")}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
            >
              Continue shopping <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="rounded-xl">
              Back to home
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={className}>
    <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </Label>
    <div className="mt-1.5">{children}</div>
  </div>
);

const PayOption = ({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left rounded-xl p-4 flex items-center gap-3 border-2 transition-colors ${
      active
        ? "border-orange-500 bg-orange-50/50"
        : "border-border bg-card hover:bg-muted/40"
    }`}
  >
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        active ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground"
      }`}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
    <span
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
        active ? "border-orange-500" : "border-muted-foreground/40"
      }`}
    >
      {active && <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
    </span>
  </button>
);

const Row = ({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) => (
  <div className="flex items-center justify-between">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className={`font-semibold ${valueClass || ""}`}>{value}</dd>
  </div>
);

const ShopHeader = () => (
  <header className="bg-[#0b0b12] text-white sticky top-0 z-40">
    <div className="container mx-auto flex items-center gap-4 py-4">
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <img src={logo} alt="Anurag Mobile" className="w-8 h-8 rounded-md" />
        <span className="font-display font-bold text-lg">Anurag Mobile</span>
      </Link>
      <nav className="hidden md:flex items-center gap-6 ml-6 text-sm">
        <Link to="/" className="hover:text-orange-400">Home</Link>
        <Link to="/order-now" className="hover:text-orange-400">Shop</Link>
        <Link to="/cart" className="hover:text-orange-400">Cart</Link>
      </nav>
      <div className="flex-1" />
      <CartIconButton variant="dark" />
    </div>
  </header>
);

export default Checkout;
