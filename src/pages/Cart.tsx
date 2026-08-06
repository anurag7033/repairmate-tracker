import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, ShoppingCart, Trash2, Minus, Plus, ArrowRight, Lock, Truck, Package, ShieldCheck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Footer from "@/components/Footer";
import logo from "@/assets/logo.png";
import CartIconButton from "@/components/shop/CartIconButton";
import { useCart, updateQuantity, removeFromCart } from "@/lib/cartStore";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TAX_RATE = 0.08; // 8% estimated tax to match the reference summary card

const Cart = () => {
  const cart = useCart();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState("");
  const [couponPhone, setCouponPhone] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<{ code: string; discount: number; label: string; name?: string } | null>(null);

  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.price * c.quantity, 0), [cart]);
  const shipping = 0; // free
  const discount = applied?.discount ?? 0;
  const taxableBase = Math.max(0, subtotal - discount);
  const tax = Math.round(taxableBase * TAX_RATE);
  const total = Math.max(0, taxableBase + tax + shipping);
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

  const applyCoupon = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    try {
      setApplying(true);
      const { data, error } = await supabase.rpc("apply_voucher_to_customer_order", {
        p_voucher_code: code,
        p_subtotal: subtotal,
        p_phone: couponPhone.trim(),
      });
      if (error) throw error;
      const res = data as any;
      const value = Math.min(Number(res?.discount_amount) || 0, subtotal);
      if (value <= 0) {
        toast.error("This voucher gives no discount on your cart");
        return;
      }
      const name = (res?.voucher_name as string) || "";
      const label = name
        ? `${name} — ₹${value.toLocaleString("en-IN")} off`
        : `₹${value.toLocaleString("en-IN")} off`;
      setApplied({ code: res?.voucher_code || code, discount: value, label, name });
      toast.success(`Voucher ${code} applied — ${label}`);
    } catch (e: any) {
      toast.error(e.message || "Invalid voucher code");
    } finally {
      setApplying(false);
    }
  };

  const removeCoupon = () => {
    setApplied(null);
    setCoupon("");
  };

  const proceedToCheckout = () => {
    if (cart.length === 0) return;
    navigate("/checkout", {
      state: applied
        ? { discountAmount: applied.discount, voucherCode: applied.code, voucherLabel: applied.label, voucherName: applied.name }
        : {},
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(240_20%_97%)]">
      <Helmet>
        <title>Your Cart – Anurag Mobile</title>
        <meta name="description" content="Review the items in your Anurag Mobile shopping cart and proceed to secure checkout." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <ShopHeader />

      <main className="container mx-auto py-8 md:py-12 flex-1">
        <header className="mb-6 md:mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold">My Shopping Cart</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {itemCount === 0
              ? "Your cart is currently empty."
              : `You have ${itemCount} item${itemCount === 1 ? "" : "s"} in your cart`}
          </p>
        </header>

        {cart.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
            {/* Left: items list */}
            <div className="space-y-4">
              {cart.map((item) => {
                const lineTotal = item.price * item.quantity;
                const hasMrp = item.mrp > item.price;
                return (
                  <article
                    key={item.productId}
                    className="bg-card border border-border rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row gap-4 md:gap-5 shadow-sm"
                  >
                    <Link
                      to={`/order-now/product/${item.productId}`}
                      className="w-full sm:w-32 h-32 rounded-xl bg-muted/40 border border-border overflow-hidden flex items-center justify-center shrink-0"
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-2" />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground" />
                      )}
                    </Link>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to={`/order-now/product/${item.productId}`}
                            className="font-display text-lg md:text-xl font-bold leading-tight hover:text-orange-600 line-clamp-2"
                          >
                            {item.name}
                          </Link>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mt-1">
                            {[item.brand, item.category].filter(Boolean).join(" • ") || item.productCode}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          aria-label={`Remove ${item.name}`}
                          className="w-9 h-9 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-auto pt-4 flex items-end justify-between gap-3">
                        {/* Qty stepper */}
                        <div className="inline-flex items-center border border-border rounded-xl bg-muted/40 h-10">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="w-9 h-full flex items-center justify-center rounded-l-xl hover:bg-muted disabled:opacity-40"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center font-semibold text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= item.maxStock}
                            className="w-9 h-full flex items-center justify-center rounded-r-xl hover:bg-muted disabled:opacity-40"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-right">
                          {hasMrp && (
                            <p className="text-xs text-muted-foreground line-through">
                              ₹{(item.mrp * item.quantity).toLocaleString("en-IN")}
                            </p>
                          )}
                          <p className="text-xl md:text-2xl font-bold text-orange-600">
                            ₹{lineTotal.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {/* Free shipping banner */}
              <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 text-blue-900 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <p className="text-sm">
                  You are eligible for <span className="font-bold">FREE Shipping</span> on this order.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/order-now"
                  className="text-sm font-semibold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
                >
                  ← Continue shopping
                </Link>
              </div>
            </div>

            {/* Right: summary */}
            <aside className="space-y-4 lg:sticky lg:top-24 self-start">
              {/* Coupon */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                    Have a voucher?
                  </p>
                  <PublicVouchersDialog onSelect={(code) => setCoupon(code)} />
                </div>

                <div className="flex gap-2">
                  <Input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    placeholder="Enter voucher code"
                    disabled={!!applied}
                    className="h-11 bg-white border-border rounded-xl"
                  />
                  {applied ? (
                    <Button
                      onClick={removeCoupon}
                      className="h-11 rounded-xl bg-white text-foreground border border-border hover:bg-muted px-5 font-bold"
                    >
                      REMOVE
                    </Button>
                  ) : (
                    <Button
                      onClick={applyCoupon}
                      disabled={applying}
                      className="h-11 rounded-xl bg-[#0b0b12] hover:bg-black text-white px-5 font-bold"
                    >
                      {applying ? "..." : "APPLY"}
                    </Button>
                  )}
                </div>
                {!applied && (
                  <Input
                    value={couponPhone}
                    onChange={(e) => setCouponPhone(e.target.value)}
                    placeholder="Your mobile number (for personal vouchers)"
                    inputMode="tel"
                    className="h-10 mt-2 bg-white border-border rounded-xl text-sm"
                  />
                )}
                {applied && (
                  <p className="text-xs text-green-700 mt-2 font-medium">
                    ✓ {applied.code} — {applied.label} applied
                  </p>
                )}
              </div>

              {/* Order Summary */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <h2 className="font-display text-xl font-bold pb-3 border-b border-border">Order Summary</h2>

                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="font-semibold">₹{subtotal.toLocaleString("en-IN")}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Shipping</dt>
                    <dd className="font-bold text-green-600">FREE</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Estimated Tax</dt>
                    <dd className="font-semibold">₹{tax.toLocaleString("en-IN")}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className={`font-semibold ${discount > 0 ? "text-green-600" : ""}`}>
                      {discount > 0 ? "-" : ""}₹{discount.toLocaleString("en-IN")}
                    </dd>
                  </div>
                </dl>

                <div className="border-t border-border mt-4 pt-4 flex items-baseline justify-between">
                  <span className="font-display text-xl font-bold">Total</span>
                  <span className="font-display text-2xl md:text-3xl font-bold text-orange-600">
                    ₹{total.toLocaleString("en-IN")}
                  </span>
                </div>

                <Button
                  onClick={proceedToCheckout}
                  className="w-full h-12 mt-5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-base tracking-wide"
                >
                  PROCEED TO CHECKOUT
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="w-3.5 h-3.5" /> Secure SSL Checkout
                </p>

                <div className="flex items-center justify-center gap-2 mt-2 opacity-70">
                  <span className="text-[10px] px-2 py-1 rounded bg-muted font-semibold">VISA</span>
                  <span className="text-[10px] px-2 py-1 rounded bg-muted font-semibold">UPI</span>
                  <span className="text-[10px] px-2 py-1 rounded bg-muted font-semibold">RUPAY</span>
                </div>

                <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <span className="flex flex-col items-center gap-1 text-center"><ShieldCheck className="w-4 h-4 text-orange-500" />Secure</span>
                  <span className="flex flex-col items-center gap-1 text-center"><Truck className="w-4 h-4 text-orange-500" />Free Ship</span>
                  <span className="flex flex-col items-center gap-1 text-center"><CreditCard className="w-4 h-4 text-orange-500" />Easy Pay</span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

const EmptyState = () => (
  <div className="bg-card border border-border rounded-2xl p-10 md:p-16 text-center shadow-sm">
    <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
      <ShoppingCart className="w-8 h-8" />
    </div>
    <h2 className="font-display text-2xl font-bold">Your cart is empty</h2>
    <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
      Looks like you haven’t added anything yet. Explore our accessories catalog and start building your order.
    </p>
    <Link
      to="/order-now"
      className="inline-flex items-center gap-2 mt-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-6 h-11 font-semibold"
    >
      Start Shopping
      <ArrowRight className="w-4 h-4" />
    </Link>
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
        <Link to="/order-now" className="hover:text-orange-400">Categories</Link>
        <Link to="/order-now" className="hover:text-orange-400">Offers</Link>
        <Link to="/cart" className="text-orange-400">Cart</Link>
      </nav>
      <div className="flex-1" />
      <div className="hidden sm:block relative w-56 md:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
        <Input
          placeholder="Search..."
          className="pl-9 h-10 bg-white/10 border-white/10 text-white placeholder:text-white/50 rounded-full"
        />
      </div>
      <CartIconButton variant="dark" />
    </div>
  </header>
);

export default Cart;
