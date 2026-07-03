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

  const submitOrder = () => {
    if (cartDetailed.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    if (!name.trim() || !phone.trim()) {
      toast({ title: "Name and phone required", variant: "destructive" });
      return;
    }
    const lines = cartDetailed.map(
      (i, idx) =>
        `${idx + 1}. ${i.product.name} (${i.product.productCode}) × ${i.qty} = ₹${(i.product.finalPrice * i.qty).toLocaleString("en-IN")}`
    );
    const msg = [
      "*New Order — Anurag Mobile*",
      "",
      `*Name:* ${name}`,
      `*Phone:* ${phone}`,
      address.trim() ? `*Address:* ${address}` : "",
      "",
      "*Items:*",
      ...lines,
      "",
      `*Total: ₹${cartTotal.toLocaleString("en-IN")}*`,
    ]
      .filter(Boolean)
      .join("\n");
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    setCart([]);
    setCheckoutOpen(false);
    toast({ title: "Order sent via WhatsApp" });
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
          <Sheet>
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
                    Checkout via WhatsApp
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setCheckoutOpen(false)}>
          <div className="bg-card rounded-2xl w-full max-w-md p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Your Details</h3>
              <button onClick={() => setCheckoutOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="ck-name">Name *</Label>
                <Input id="ck-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg" />
              </div>
              <div>
                <Label htmlFor="ck-phone">Phone *</Label>
                <Input id="ck-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 rounded-lg" />
              </div>
              <div>
                <Label htmlFor="ck-addr">Delivery Address</Label>
                <Textarea id="ck-addr" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-lg" rows={3} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-bold text-lg">₹{cartTotal.toLocaleString("en-IN")}</span>
              </div>
              <Button onClick={submitOrder} className="w-full h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold">
                <MessageCircle className="w-4 h-4 mr-2" /> Send Order on WhatsApp
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
