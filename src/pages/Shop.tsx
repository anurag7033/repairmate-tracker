import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Search, ShoppingCart, Plus, Minus, Trash2, Package, ArrowLeft, X, Loader2,
  Truck, CreditCard, Tag, Check, Loader,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { getProducts } from "@/lib/productStore";
import { Product, stockStatusOf } from "@/types/product";
import { createCustomerOrder, applyVoucherToOrder } from "@/lib/customerOrderStore";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window { Razorpay: any }
}

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
import Footer from "@/components/Footer";
import logo from "@/assets/logo.png";

type CartItem = { productId: string; qty: number };

const CART_KEY = "shop_cart_v1";
const WHATSAPP = "917033067221";

const Shop = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
  });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucher, setVoucher] = useState<{ id: string; code: string; discount: number } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getProducts();
        setProducts(data.filter((p) => p.status === "active"));
      } catch (e: any) {
        toast({ title: "Failed to load products", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.productCode.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, search, category]);

  const cartDetailed = useMemo(() => {
    return cart
      .map((c) => {
        const p = products.find((x) => x.id === c.productId);
        return p ? { product: p, qty: c.qty } : null;
      })
      .filter(Boolean) as { product: Product; qty: number }[];
  }, [cart, products]);

  const cartTotal = cartDetailed.reduce((s, i) => s + i.product.finalPrice * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const addToCart = (p: Product) => {
    if (p.stockQuantity <= 0) {
      toast({ title: "Out of stock", variant: "destructive" });
      return;
    }
    setCart((prev) => {
      const ex = prev.find((c) => c.productId === p.id);
      if (ex) {
        if (ex.qty + 1 > p.stockQuantity) {
          toast({ title: "Max stock reached", variant: "destructive" });
          return prev;
        }
        return prev.map((c) => (c.productId === p.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { productId: p.id, qty: 1 }];
    });
    toast({ title: "Added to cart", description: p.name });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const p = products.find((x) => x.id === id);
      return prev.flatMap((c) => {
        if (c.productId !== id) return [c];
        const next = c.qty + delta;
        if (next <= 0) return [];
        if (p && next > p.stockQuantity) {
          toast({ title: "Max stock reached", variant: "destructive" });
          return [c];
        }
        return [{ ...c, qty: next }];
      });
    });
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((c) => c.productId !== id));

  const discountAmount = paymentMethod === "online" && voucher ? Math.min(voucher.discount, cartTotal) : 0;
  const grandTotal = Math.max(0, cartTotal - discountAmount);

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    if (paymentMethod !== "online") {
      toast({ title: "Voucher only for online payment", variant: "destructive" });
      return;
    }
    setVoucherLoading(true);
    try {
      const res = await applyVoucherToOrder(voucherCode.trim().toUpperCase(), cartTotal, phone.trim());
      setVoucher({ id: res.voucherId, code: res.voucherCode, discount: res.discountAmount });
      toast({ title: "Voucher applied", description: `₹${res.discountAmount.toLocaleString("en-IN")} off` });
    } catch (e: any) {
      setVoucher(null);
      toast({ title: "Voucher error", description: e.message, variant: "destructive" });
    } finally {
      setVoucherLoading(false);
    }
  };

  const removeVoucher = () => { setVoucher(null); setVoucherCode(""); };

  const submitOrder = async () => {
    if (cartDetailed.length === 0) return toast({ title: "Cart is empty", variant: "destructive" });
    if (!name.trim() || !phone.trim() || !address.trim())
      return toast({ title: "Name, phone and address are required", variant: "destructive" });

    const itemsPayload = cartDetailed.map((i) => ({
      productId: i.product.id,
      productCode: i.product.productCode,
      productName: i.product.name,
      unitPrice: i.product.finalPrice,
      quantity: i.qty,
    }));

    setPlacingOrder(true);
    try {
      if (paymentMethod === "online") {
        const ok = await loadRazorpay();
        if (!ok) throw new Error("Failed to load payment gateway");

        const { data: createData, error: createErr } = await supabase.functions.invoke(
          "create-shop-razorpay-order",
          { body: { amount: grandTotal, customerName: name.trim(), customerPhone: phone.trim() } }
        );
        if (createErr || !createData?.razorpayOrderId) {
          throw new Error(createErr?.message || createData?.error || "Payment init failed");
        }

        await new Promise<void>((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: createData.keyId,
            amount: createData.amount,
            currency: createData.currency,
            order_id: createData.razorpayOrderId,
            name: "Anurag Mobile",
            description: `Order for ${name.trim()}`,
            prefill: { name: name.trim(), contact: phone.trim(), email: email.trim() || undefined },
            theme: { color: "#f97316" },
            handler: async (resp: any) => {
              try {
                const { data: verifyData, error: verifyErr } = await supabase.functions.invoke(
                  "verify-shop-payment-and-place-order",
                  {
                    body: {
                      razorpay_order_id: resp.razorpay_order_id,
                      razorpay_payment_id: resp.razorpay_payment_id,
                      razorpay_signature: resp.razorpay_signature,
                      orderPayload: {
                        customerName: name.trim(),
                        customerPhone: phone.trim(),
                        customerEmail: email.trim() || undefined,
                        deliveryAddress: address.trim(),
                        voucherId: voucher?.id ?? null,
                        voucherCode: voucher?.code ?? null,
                        discountAmount,
                        items: itemsPayload,
                      },
                    },
                  }
                );
                if (verifyErr || !verifyData?.orderId) {
                  reject(new Error(verifyErr?.message || verifyData?.error || "Verification failed"));
                  return;
                }
                setCart([]);
                setCheckoutOpen(false);
                navigate(`/order-success/${verifyData.orderId}`);
                resolve();
              } catch (e: any) {
                reject(e);
              }
            },
            modal: {
              ondismiss: () => reject(new Error("Payment cancelled")),
            },
          });
          rzp.on("payment.failed", (r: any) => reject(new Error(r?.error?.description || "Payment failed")));
          rzp.open();
        });
      } else {
        const order = await createCustomerOrder({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim() || undefined,
          deliveryAddress: address.trim(),
          paymentMethod,
          voucherId: voucher?.id ?? null,
          voucherCode: voucher?.code ?? null,
          discountAmount,
          items: itemsPayload,
        });
        setCart([]);
        setCheckoutOpen(false);
        navigate(`/order-success/${order.orderId}`);
      }
    } catch (e: any) {
      toast({ title: "Order failed", description: e.message, variant: "destructive" });
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Shop Mobile Accessories Online — Anurag Mobile</title>
        <meta name="description" content="Browse and order mobile phones, chargers, earphones, covers and genuine accessories from Anurag Mobile with home delivery." />
        <link rel="canonical" href="https://tracking.anuragmobile.in/shop" />
      </Helmet>

      <header className="sticky top-0 z-30 bg-blue-950 text-white border-b border-white/10 shadow-md">
        <div className="container mx-auto flex items-center justify-between py-3 gap-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Anurag Mobile" className="w-9 h-9 rounded-lg" />
            <div className="hidden sm:block">
              <div className="font-display font-bold leading-tight">Anurag Mobile</div>
              <div className="text-[10px] text-white/60 leading-tight">Online Shop</div>
            </div>
          </button>
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products, brands, categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-white text-foreground border-white/20"
            />
          </div>
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button className="relative h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shrink-0">
                <ShoppingCart className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-orange-500">
                    {cartCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
              <SheetHeader className="p-5 border-b">
                <SheetTitle>Your Cart ({cartCount})</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {cartDetailed.length === 0 ? (
                  <div className="text-center text-muted-foreground py-16">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Your cart is empty.</p>
                  </div>
                ) : (
                  cartDetailed.map((i) => (
                    <div key={i.product.id} className="flex gap-3 p-3 rounded-xl border border-border">
                      {i.product.imageUrl ? (
                        <img src={i.product.imageUrl} alt={i.product.name} className="w-16 h-16 rounded-lg object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{i.product.name}</div>
                        <div className="text-xs text-muted-foreground">₹{i.product.finalPrice.toLocaleString("en-IN")}</div>
                        <div className="flex items-center gap-1 mt-2">
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(i.product.id, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">{i.qty}</span>
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(i.product.id, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto text-destructive" onClick={() => removeItem(i.product.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="font-semibold text-sm">
                        ₹{(i.product.finalPrice * i.qty).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {cartDetailed.length > 0 && (
                <div className="p-5 border-t space-y-3">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-lg">₹{cartTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <Button className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600" onClick={() => setCheckoutOpen(true)}>
                    Checkout
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>

        {categories.length > 0 && (
          <div className="container mx-auto pb-3 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setCategory("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${
                category === "all" ? "bg-orange-500 text-white border-orange-500" : "bg-white/10 text-white border-white/20 hover:bg-white/20"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${
                  category === c ? "bg-orange-500 text-white border-orange-500" : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="container mx-auto py-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Home
          </Button>
          <p className="text-sm text-muted-foreground">{filtered.length} product{filtered.length === 1 ? "" : "s"}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading products...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => {
              const ss = stockStatusOf(p);
              const oos = ss === "out_of_stock";
              return (
                <div
                  key={p.id}
                  className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="aspect-square bg-muted relative">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                    {p.discountValue > 0 && (
                      <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        {p.discountType === "percentage" ? `${p.discountValue}% OFF` : `₹${p.discountValue} OFF`}
                      </span>
                    )}
                    {oos && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">Out of Stock</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    {p.brand && <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{p.brand}</div>}
                    <div className="font-semibold text-sm line-clamp-2 mb-1">{p.name}</div>
                    <div className="mt-auto flex items-baseline gap-2">
                      <span className="font-bold text-primary">₹{p.finalPrice.toLocaleString("en-IN")}</span>
                      {p.discountValue > 0 && (
                        <span className="text-xs text-muted-foreground line-through">
                          ₹{p.sellingPrice.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      disabled={oos}
                      onClick={() => addToCart(p)}
                      className="mt-3 h-9 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold"
                    >
                      <ShoppingCart className="w-3 h-3 mr-1" /> Add to Cart
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {checkoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setCheckoutOpen(false)}>
          <div className="bg-card rounded-2xl w-full max-w-lg my-8 shadow-elevated max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-display text-lg font-bold">Checkout</h3>
              <button onClick={() => setCheckoutOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ck-name">Name *</Label>
                  <Input id="ck-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg" />
                </div>
                <div>
                  <Label htmlFor="ck-phone">Phone *</Label>
                  <Input id="ck-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 rounded-lg" />
                </div>
              </div>
              <div>
                <Label htmlFor="ck-email">Email (optional)</Label>
                <Input id="ck-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 rounded-lg" />
              </div>
              <div>
                <Label htmlFor="ck-addr">Delivery Address *</Label>
                <Textarea id="ck-addr" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-lg" rows={3} />
              </div>

              <div>
                <Label className="mb-2 block">Payment Method *</Label>
                <RadioGroup value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v as any); if (v !== "online") setVoucher(null); }} className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer ${paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value="cod" id="pm-cod" />
                    <Truck className="w-4 h-4" />
                    <span className="text-sm font-semibold">Cash on Delivery</span>
                  </label>
                  <label className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer ${paymentMethod === "online" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value="online" id="pm-online" />
                    <CreditCard className="w-4 h-4" />
                    <span className="text-sm font-semibold">Pay Online</span>
                  </label>
                </RadioGroup>
              </div>

              {paymentMethod === "online" && (
                <div>
                  <Label className="mb-2 flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Voucher Code (optional)</Label>
                  {voucher ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2 text-green-800">
                        <Check className="w-4 h-4" />
                        <span className="font-mono font-semibold">{voucher.code}</span>
                        <span className="text-sm">−₹{voucher.discount.toLocaleString("en-IN")}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={removeVoucher} className="text-destructive">Remove</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input value={voucherCode} onChange={(e) => setVoucherCode(e.target.value.toUpperCase())} placeholder="ENTER CODE" className="h-10 rounded-lg font-mono uppercase" />
                      <Button onClick={handleApplyVoucher} disabled={voucherLoading || !voucherCode.trim()} className="h-10 rounded-lg">
                        {voucherLoading ? <Loader className="w-4 h-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">Vouchers apply to online payments only.</p>
                </div>
              )}

              <div className="rounded-xl bg-muted/50 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal ({cartCount} items)</span><span>₹{cartTotal.toLocaleString("en-IN")}</span></div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-700"><span>Voucher discount</span><span>−₹{discountAmount.toLocaleString("en-IN")}</span></div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-border"><span>Total</span><span className="text-primary">₹{grandTotal.toLocaleString("en-IN")}</span></div>
              </div>
            </div>
            <div className="p-5 border-t">
              <Button onClick={submitOrder} disabled={placingOrder} className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                {placingOrder ? <><Loader className="w-4 h-4 mr-2 animate-spin" /> Placing Order...</> : `Place Order · ₹${grandTotal.toLocaleString("en-IN")}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Shop;
