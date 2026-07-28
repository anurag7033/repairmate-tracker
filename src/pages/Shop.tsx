import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Search, ShoppingCart, Plus, Minus, Trash2, Package, ArrowLeft, X, Loader2,
  Truck, CreditCard, Tag, Check, Loader, Home as HomeIcon, LayoutGrid, Ticket, Menu, ChevronRight,
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
import logo from "@/assets/logo.png";

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

type CartItem = { productId: string; qty: number };
type Tab = "home" | "categories" | "offers" | "cart";

const CART_KEY = "shop_cart_v1";

const Shop = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [category, setCategory] = useState<string>("all");
  const [tab, setTab] = useState<Tab>("home");
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

  useEffect(() => {
    return () => {
      setCart([]);
      localStorage.removeItem(CART_KEY);
    };
  }, []);

  const categoryList = useMemo(() => {
    const map = new Map<string, { name: string; count: number; image?: string }>();
    for (const p of products) {
      const key = p.category || "Other";
      const ex = map.get(key);
      if (ex) {
        ex.count += 1;
        if (!ex.image && p.imageUrl) ex.image = p.imageUrl;
      } else {
        map.set(key, { name: key, count: 1, image: p.imageUrl || undefined });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [products]);

  const trending = useMemo(() => {
    return [...products]
      .filter((p) => p.discountValue > 0)
      .sort((a, b) => (b.discountValue || 0) - (a.discountValue || 0))
      .slice(0, 6);
  }, [products]);

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
    toast({ title: "Added to cart", description: p.name, duration: 1500 });
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
            modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
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

  const openCategory = (name: string) => {
    setCategory(name);
    setTab("categories");
    setSearch("");
    window.scrollTo({ top: 0 });
  };

  const showingResults = tab === "categories" || search.trim().length > 0;

  const ProductCard = ({ p }: { p: Product }) => {
    const ss = stockStatusOf(p);
    const oos = ss === "out_of_stock";
    return (
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
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
              <span className="text-xs text-muted-foreground line-through">₹{p.sellingPrice.toLocaleString("en-IN")}</span>
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
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7FB]">
      <Helmet>
        <title>Shop Mobile Accessories Online — Anurag Mobile</title>
        <meta name="description" content="Browse and order mobile phones, chargers, earphones, covers and genuine accessories from Anurag Mobile with home delivery." />
        <link rel="canonical" href="https://tracking.anuragmobile.in/shop" />
      </Helmet>

      {/* Dark app header */}
      <header className="sticky top-0 z-30 bg-[#0B0B14] text-white">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} aria-label="Home" className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10">
              <Menu className="w-5 h-5" />
            </button>
            <button onClick={() => { setTab("home"); setCategory("all"); setSearch(""); }} className="flex items-center gap-2">
              <img src={logo} alt="Anurag Mobile" className="w-7 h-7 rounded-md" />
              <span className="font-display font-bold text-lg tracking-tight">Anurag Mobile</span>
            </button>
          </div>
          <button onClick={() => setSearchOpen((s) => !s)} aria-label="Search" className="p-1.5 -mr-1.5 rounded-lg hover:bg-white/10">
            <Search className="w-5 h-5" />
          </button>
        </div>
        {searchOpen && (
          <div className="max-w-3xl mx-auto px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, brands, categories..."
                className="pl-10 h-10 rounded-xl bg-white text-foreground border-white/20"
              />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-5 pb-28">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : showingResults ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => { setTab("home"); setCategory("all"); setSearch(""); }} className="-ml-2 text-muted-foreground">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <p className="text-sm text-muted-foreground">
                {category !== "all" ? category : search.trim() ? `"${search}"` : "All"} · {filtered.length}
              </p>
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No products found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            )}
          </>
        ) : tab === "offers" ? (
          <>
            <h1 className="font-display text-3xl font-extrabold tracking-tight mb-1">Offers</h1>
            <p className="text-muted-foreground text-sm mb-5">Discounted items available right now.</p>
            {trending.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No active offers.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {trending.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Browse Categories */}
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Browse Categories</h1>
            <p className="text-muted-foreground text-sm mt-1 mb-5">
              Explore our curated selection of premium mobile essentials.
            </p>

            {categoryList.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No products available yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {categoryList.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => openCategory(c.name)}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-muted text-left group shadow-sm hover:shadow-lg transition-shadow"
                  >
                    {c.image ? (
                      <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                        <Package className="w-12 h-12 text-slate-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="text-white text-[11px] font-semibold bg-black/40 backdrop-blur px-2 py-0.5 rounded-full">
                        {c.count} Items
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="text-white font-display font-bold text-lg leading-tight drop-shadow">{c.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Trending Collections */}
            {trending.length > 0 && (
              <>
                <h2 className="font-display text-2xl font-extrabold tracking-tight mt-8 mb-4">Trending Collections</h2>
                <div className="flex gap-3 sm:gap-4 overflow-x-auto -mx-4 px-4 pb-2 snap-x snap-mandatory">
                  {[
                    { title: "MagSafe Essentials", tag: "NEW ARRIVAL", desc: "Discover the future of charging with our magnetic ecosystem.", bg: "bg-orange-500", text: "text-white", cta: "bg-black text-white" },
                    { title: "Work Anywhere", tag: "EDITOR'S PICK", desc: "Elevate your pro mobile setup with premium accessories.", bg: "bg-indigo-100", text: "text-slate-900", cta: "bg-black text-white" },
                  ].map((coll) => (
                    <div key={coll.title} className={`${coll.bg} ${coll.text} snap-start shrink-0 w-[280px] sm:w-[340px] rounded-2xl p-5 shadow-sm`}>
                      <div className="text-[11px] font-bold tracking-wider opacity-80">{coll.tag}</div>
                      <div className="font-display font-extrabold text-2xl leading-tight mt-2">{coll.title}</div>
                      <p className="text-sm opacity-90 mt-2">{coll.desc}</p>
                      <button
                        onClick={() => { setTab("offers"); }}
                        className={`${coll.cta} inline-flex mt-4 px-4 py-2 rounded-full text-sm font-semibold`}
                      >
                        {coll.tag === "NEW ARRIVAL" ? "View All" : "Explore"}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Cart sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
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
              <Button className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>
                Checkout
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto grid grid-cols-4">
          {([
            { key: "home", label: "Home", icon: HomeIcon },
            { key: "categories", label: "Categories", icon: LayoutGrid },
            { key: "offers", label: "Offers", icon: Ticket },
            { key: "cart", label: "Cart", icon: ShoppingCart },
          ] as const).map(({ key, label, icon: Icon }) => {
            const active = key === "cart" ? cartOpen : tab === key && !search.trim();
            return (
              <button
                key={key}
                onClick={() => {
                  if (key === "cart") { setCartOpen(true); return; }
                  setSearch("");
                  if (key === "categories") { setCategory("all"); setTab("categories"); }
                  else { setTab(key); setCategory("all"); }
                  window.scrollTo({ top: 0 });
                }}
                className="flex flex-col items-center gap-1 py-2.5 relative"
              >
                <div className={`flex items-center justify-center h-9 px-4 rounded-full transition-colors ${active ? "bg-orange-500 text-white" : "text-slate-500"}`}>
                  <Icon className="w-5 h-5" />
                  {key === "cart" && cartCount > 0 && (
                    <span className={`ml-1.5 text-[10px] font-bold rounded-full px-1.5 py-0.5 ${active ? "bg-white text-orange-600" : "bg-orange-500 text-white"}`}>
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-semibold ${active ? "text-orange-600" : "text-slate-500"}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Checkout dialog */}
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
    </div>
  );
};

export default Shop;
