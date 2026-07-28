import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Search,
  ShoppingCart,
  ChevronRight,
  Heart,
  Star,
  Zap,
  ShieldCheck,
  Truck,
  RefreshCcw,
  Minus,
  Plus,
  Package,
  Smartphone,
  Hash,
  Layers,
  Box,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Footer from "@/components/Footer";
import logo from "@/assets/logo.png";
import { getProductById } from "@/lib/productStore";
import { Product, stockStatusOf, STOCK_STATUS_LABEL } from "@/types/product";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const p = await getProductById(id);
        setProduct(p);
        if (p?.imageUrl) setActiveImage(p.imageUrl);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const stockStatus = useMemo(() => (product ? stockStatusOf(product) : null), [product]);
  const hasDiscount = product && product.sellingPrice > product.finalPrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.sellingPrice - product.finalPrice) / product.sellingPrice) * 100)
    : 0;

  const thumbnails = useMemo(() => {
    if (!product) return [];
    const base = product.imageUrl ? [product.imageUrl] : [];
    // Pad with the same image so the gallery always has 4 thumbnails like the reference
    while (base.length < 4) base.push(product.imageUrl || "");
    return base.filter(Boolean);
  }, [product]);

  const increment = () => setQty((q) => Math.min(q + 1, product?.stockQuantity || 1));
  const decrement = () => setQty((q) => Math.max(1, q - 1));

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[hsl(240_20%_97%)]">
        <HeaderSkeleton />
        <main className="container mx-auto py-8 flex-1">
          <div className="grid lg:grid-cols-2 gap-10 animate-pulse">
            <div className="aspect-square bg-muted rounded-2xl" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-[hsl(240_20%_97%)]">
        <Header />
        <main className="container mx-auto py-16 flex-1 text-center">
          <Package className="w-14 h-14 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-display text-2xl font-bold">Product not found</h1>
          <p className="text-muted-foreground mt-2 mb-6">The product you are looking for does not exist or is unavailable.</p>
          <Button onClick={() => navigate("/order-now")} className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6">
            Browse Categories
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(240_20%_97%)]">
      <Helmet>
        <title>{product.name} – Anurag Mobile</title>
        <meta name="description" content={`Buy ${product.name} at Anurag Mobile. ${product.description.slice(0, 120)}`} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.description.slice(0, 160)} />
        <meta property="og:type" content="product" />
      </Helmet>

      <Header />

      <main className="container mx-auto py-6 md:py-10 flex-1">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/order-now" className="hover:text-foreground">Accessories</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to={`/order-now/category/${encodeURIComponent(product.category)}`} className="hover:text-foreground capitalize">
            {product.category.toLowerCase()}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* Product Hero */}
        <section className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-2xl border border-border overflow-hidden shadow-sm flex items-center justify-center p-6">
              {activeImage ? (
                <img src={activeImage} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <div className="text-muted-foreground text-sm">No image available</div>
              )}
              <button
                aria-label="Add to wishlist"
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Heart className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            {thumbnails.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {thumbnails.map((src, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(src)}
                    className={`aspect-square rounded-xl border overflow-hidden bg-white p-2 transition-all ${
                      activeImage === src ? "border-orange-500 ring-2 ring-orange-500/20" : "border-border hover:border-orange-300"
                    }`}
                  >
                    <img src={src} alt={`${product.name} view ${idx + 1}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                {discountPercent > 0 && (
                  <span className="inline-block bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide mb-2">
                    Best Seller
                  </span>
                )}
                <div className="flex items-center gap-2 text-sm mb-2">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold text-foreground ml-1">4.8</span>
                  </div>
                  <span className="text-muted-foreground">(1,240 Reviews)</span>
                </div>
                <h1 className="font-display text-2xl md:text-4xl font-bold leading-tight">{product.name}</h1>
                <p className="text-muted-foreground mt-3 leading-relaxed">{product.description || "Premium quality accessory engineered for reliability and everyday performance."}</p>
              </div>
            </div>

            {/* Price */}
            <div className="mt-6 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl md:text-4xl font-bold text-orange-600">₹{product.finalPrice.toLocaleString("en-IN")}</span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">₹{product.sellingPrice.toLocaleString("en-IN")}</span>
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">-{discountPercent}% OFF</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <span
                  className={`w-2 h-2 rounded-full ${
                    stockStatus === "in_stock" ? "bg-green-500" : stockStatus === "low_stock" ? "bg-amber-500" : "bg-red-500"
                  }`}
                />
                <span className="text-muted-foreground">
                  {stockStatus === "in_stock" ? "In Stock" : stockStatus === "low_stock" ? "Low Stock" : "Out of Stock"}
                  {stockStatus !== "out_of_stock" && <span className="text-green-600 font-medium ml-1">· Ships within 24 hours</span>}
                </span>
              </div>
            </div>

            {/* Spec highlights */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Brand</p>
                  <p className="font-semibold text-sm truncate">{product.brand || "Anurag Mobile"}</p>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Category</p>
                  <p className="font-semibold text-sm truncate capitalize">{product.category.toLowerCase()}</p>
                </div>
              </div>
            </div>

            {/* Color selector placeholder */}
            <div className="mt-6">
              <p className="text-sm font-semibold mb-2">SELECT COLOR: <span className="font-normal text-muted-foreground">Midnight Black</span></p>
              <div className="flex items-center gap-3">
                <button className="w-10 h-10 rounded-full bg-neutral-900 ring-2 ring-offset-2 ring-orange-500 border border-border" aria-label="Midnight Black" />
                <button className="w-10 h-10 rounded-full bg-neutral-200 border border-border hover:ring-2 hover:ring-offset-2 hover:ring-muted-foreground" aria-label="Silver" />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-3">
              <div className="flex items-center border border-border rounded-xl bg-card h-12 px-2">
                <button onClick={decrement} disabled={qty <= 1} className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center disabled:opacity-40">
                  <Minus className="w-4 h-4" />
                </button>
                <Input
                  type="number"
                  min={1}
                  max={product.stockQuantity || 1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value) || 1, product.stockQuantity || 1)))}
                  className="w-14 h-9 text-center border-0 focus-visible:ring-0 p-0"
                />
                <button onClick={increment} disabled={qty >= (product.stockQuantity || 1)} className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center disabled:opacity-40">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button
                disabled={stockStatus === "out_of_stock"}
                className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-base"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              <Button
                disabled={stockStatus === "out_of_stock"}
                className="flex-1 h-12 bg-[#0b0b12] hover:bg-black text-white rounded-xl font-semibold text-base"
              >
                Buy Now
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> 2 Year Warranty</span>
              <span className="flex items-center gap-1.5"><Truck className="w-4 h-4" /> Free Delivery</span>
              <span className="flex items-center gap-1.5"><RefreshCcw className="w-4 h-4" /> 30-Day Returns</span>
            </div>
          </div>
        </section>

        {/* Technical Engineering */}
        <section className="mt-14 md:mt-20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold">Technical Specifications</h2>
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                Engineered for reliability. All details are verified against the product catalog before dispatch.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 bg-[#0b0b12] text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" /> Genuine Product
              </span>
              <span className="inline-flex items-center gap-1.5 bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                <Zap className="w-3.5 h-3.5" /> Tested
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SpecCard icon={<Smartphone className="w-5 h-5" />} title="Compatible With" value="Smartphones, Tablets & Accessories" note="Universal fit for major brands" />
            <SpecCard icon={<Box className="w-5 h-5" />} title="Stock Available" value={`${product.stockQuantity} Units`} note={STOCK_STATUS_LABEL[stockStatus!]} />
            <SpecCard icon={<Hash className="w-5 h-5" />} title="Product Code" value={product.productCode} note="Scan or quote for quick billing" />
            <SpecCard icon={<Layers className="w-5 h-5" />} title="Category" value={product.category} note={`Browse more ${product.category.toLowerCase()}`} />
          </div>
        </section>

        {/* Feature highlight */}
        <section className="mt-10">
          <div className="rounded-3xl bg-[#0b0b12] text-white p-6 md:p-10 overflow-hidden relative">
            <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Premium Quality Assurance</h2>
                <p className="text-white/70 leading-relaxed text-sm md:text-base">
                  Every product at Anurag Mobile passes a quality check before it reaches you. Shop confidently with genuine accessories, transparent pricing, and local support.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Quality Checked</p>
                      <p className="text-white/60 text-xs mt-0.5">Verified before dispatch.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Fast Dispatch</p>
                      <p className="text-white/60 text-xs mt-0.5">Ships within 24 hours.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <p className="text-sm font-semibold mb-4">Why shop with us?</p>
                <ul className="space-y-3 text-sm text-white/80">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Best price guarantee on accessories</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Easy returns within 30 days</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Local support at Anurag Mobile</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Cash on delivery available</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Stock warning */}
        {stockStatus === "low_stock" && (
          <div className="mt-8 flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 rounded-xl p-4 border border-amber-100 dark:border-amber-900/30">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">Only {product.stockQuantity} units left in stock. Order soon to avoid missing out.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

const Header = () => {
  const navigate = useNavigate();
  return (
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
          <Link to="/order-now" className="hover:text-orange-400">Cart</Link>
        </nav>
        <div className="flex-1" />
        <button aria-label="Search" className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center"><Search className="w-5 h-5" /></button>
        <button aria-label="Cart" className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center"><ShoppingCart className="w-5 h-5" /></button>
      </div>
    </header>
  );
};

const HeaderSkeleton = () => (
  <header className="bg-[#0b0b12] text-white">
    <div className="container mx-auto flex items-center gap-4 py-4">
      <div className="w-8 h-8 bg-white/10 rounded-md animate-pulse" />
      <div className="w-32 h-5 bg-white/10 rounded animate-pulse" />
      <div className="flex-1" />
      <div className="w-9 h-9 bg-white/10 rounded-full animate-pulse" />
    </div>
  </header>
);

const SpecCard = ({
  icon,
  title,
  value,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  note: string;
}) => (
  <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-card transition-shadow">
    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
      {icon}
    </div>
    <p className="text-[11px] uppercase text-muted-foreground font-semibold">{title}</p>
    <p className="font-bold text-lg mt-1">{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{note}</p>
  </div>
);

export default ProductDetail;
