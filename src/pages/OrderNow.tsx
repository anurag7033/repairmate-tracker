import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, ShoppingCart, LayoutGrid, List, ArrowRight, Package, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import logo from "@/assets/logo.png";
import { getProducts } from "@/lib/productStore";
import { Product, stockStatusOf } from "@/types/product";

type ViewMode = "grid" | "list";

const OrderNow = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await getProducts();
        setProducts(list.filter((p) => p.status === "active"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, { name: string; count: number; image: string | null }>();
    for (const p of products) {
      const cat = (p.category || "Other").trim() || "Other";
      const key = cat.toLowerCase();
      const cur = map.get(key);
      if (cur) {
        cur.count += 1;
        if (!cur.image && p.imageUrl) cur.image = p.imageUrl;
      } else {
        map.set(key, { name: cat, count: 1, image: p.imageUrl });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory && p.category.toLowerCase() !== activeCategory.toLowerCase()) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.productCode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, search, activeCategory]);

  const trending = useMemo(() => products.slice(0, 6), [products]);

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(240_20%_97%)]">
      <Helmet>
        <title>Order Mobile Accessories – Anurag Mobile</title>
        <meta name="description" content="Browse and order premium mobile accessories from Anurag Mobile. Chargers, covers, tempered glass, audio gear and more." />
        <link rel="canonical" href="https://tracking.anuragmobile.in/order-now" />
      </Helmet>

      {/* Top Dark Nav */}
      <header className="bg-[#0b0b12] text-white sticky top-0 z-40">
        <div className="container mx-auto flex items-center gap-4 py-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Anurag Mobile" className="w-8 h-8 rounded-md" />
            <span className="font-display font-bold text-lg">Anurag Mobile</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 ml-4 text-sm">
            <Link to="/" className="hover:text-orange-400 transition-colors">Home</Link>
            <button
              onClick={() => setActiveCategory(null)}
              className={`transition-colors ${!activeCategory ? "text-orange-500 border-b-2 border-orange-500 pb-0.5" : "hover:text-orange-400"}`}
            >
              Categories
            </button>
            <a href="#trending" className="hover:text-orange-400 transition-colors">New Arrivals</a>
            <a href="#trending" className="hover:text-orange-400 transition-colors">Offers</a>
          </nav>
          <div className="flex-1" />
          <div className="relative hidden sm:block w-56 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search accessories..."
              className="pl-9 h-10 bg-white/10 border-white/10 text-white placeholder:text-white/50 rounded-full focus-visible:ring-orange-500"
            />
          </div>
          <button
            aria-label="Cart"
            className="relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
        {/* Mobile search */}
        <div className="container mx-auto pb-3 sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search accessories..."
              className="pl-9 h-10 bg-white/10 border-white/10 text-white placeholder:text-white/50 rounded-full"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 md:py-12 flex-1">
        {/* Browse Categories */}
        <section aria-labelledby="cats-heading">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h1 id="cats-heading" className="font-display text-3xl md:text-5xl font-bold text-foreground">Browse Categories</h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">Explore our curated selection of premium mobile essentials.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
              <span className="hidden sm:inline">View:</span>
              <div className="inline-flex rounded-lg border border-border bg-card p-1">
                <button
                  onClick={() => setView("grid")}
                  className={`w-8 h-8 rounded-md flex items-center justify-center ${view === "grid" ? "bg-orange-500 text-white" : "text-muted-foreground"}`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`w-8 h-8 rounded-md flex items-center justify-center ${view === "list" ? "bg-orange-500 text-white" : "text-muted-foreground"}`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {categories.map((c) => {
                const isActive = activeCategory?.toLowerCase() === c.name.toLowerCase();
                return (
                  <button
                    key={c.name}
                    onClick={() => navigate(`/order-now/category/${encodeURIComponent(c.name)}`)}
                    className={`group relative aspect-[4/3] rounded-2xl overflow-hidden text-left shadow-card border transition-all border-border hover:border-orange-500/40`}
                  >
                    {c.image ? (
                      <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white/60 text-xs">img</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-orange-400 text-xs font-semibold mb-1">{c.count} {c.count === 1 ? "Item" : "Items"}</p>
                      <p className="text-white font-bold text-lg leading-tight capitalize">{c.name.toLowerCase()}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-2">
              {categories.map((c) => {
                const isActive = activeCategory?.toLowerCase() === c.name.toLowerCase();
                return (
                  <button
                    key={c.name}
                    onClick={() => navigate(`/order-now/category/${encodeURIComponent(c.name)}`)}
                    className={`flex items-center gap-4 p-3 rounded-xl border bg-card transition-colors border-border hover:border-orange-500/40`}
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                      {c.image && <img src={c.image} alt={c.name} className="w-full h-full object-cover" loading="lazy" />}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold capitalize">{c.name.toLowerCase()}</p>
                      <p className="text-xs text-muted-foreground">{c.count} items</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Products list (filtered) */}
        {(activeCategory || search) && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold">
                {activeCategory ? <span className="capitalize">{activeCategory.toLowerCase()}</span> : "Search results"}
                <span className="text-muted-foreground text-base font-normal ml-2">({filtered.length})</span>
              </h2>
              {activeCategory && (
                <Button variant="ghost" size="sm" onClick={() => setActiveCategory(null)}>Clear</Button>
              )}
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                No products found.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.slice(0, 24).map((p) => {
                  const s = stockStatusOf(p);
                  return (
                    <Link key={p.id} to={`/order-now/product/${p.id}`} className="bg-card rounded-2xl border border-border overflow-hidden shadow-card group hover:border-orange-500/40 transition-colors">
                      <div className="aspect-square bg-muted overflow-hidden">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-muted-foreground truncate">{p.brand || p.category}</p>
                        <p className="font-semibold text-sm line-clamp-2 min-h-[2.5rem] group-hover:text-orange-600 transition-colors">{p.name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="font-bold text-orange-600">₹{p.finalPrice.toLocaleString("en-IN")}</p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s === "in_stock" ? "bg-green-100 text-green-700" : s === "low_stock" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                            {s === "in_stock" ? "In Stock" : s === "low_stock" ? "Low" : "Out"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Trending Collections */}
        <section id="trending" className="mt-14 pt-8 border-t border-border">
          <div className="flex items-end justify-between mb-6">
            <h2 className="font-display text-2xl md:text-3xl font-bold">Trending Collections</h2>
            <a href="#" className="text-orange-600 font-semibold text-sm hidden sm:inline-flex items-center gap-1">
              View All Collections <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="grid md:grid-cols-3 gap-4 md:gap-5">
            {/* Orange */}
            <div className="rounded-2xl p-6 bg-orange-500 text-white relative overflow-hidden min-h-[220px] flex flex-col">
              <span className="inline-block bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold w-fit">NEW ARRIVAL</span>
              <h3 className="font-display text-3xl font-bold mt-4 leading-tight">MagSafe<br />Essentials</h3>
              <p className="text-white/90 text-sm mt-2">The future of magnetic charging.</p>
              <Zap className="absolute -right-4 -bottom-4 w-40 h-40 text-white/10" />
              <Button
                onClick={() => { setActiveCategory("Charger"); window.scrollTo({ top: 400, behavior: "smooth" }); }}
                className="mt-auto w-fit bg-black hover:bg-black/80 text-white rounded-full"
              >
                Explore Collection
              </Button>
            </div>
            {/* Blue soft */}
            <div className="rounded-2xl p-6 bg-blue-100 text-slate-900 relative overflow-hidden min-h-[220px] flex flex-col">
              <span className="inline-block bg-white px-3 py-1 rounded-full text-xs font-semibold w-fit text-orange-600">EDITOR'S CHOICE</span>
              <h3 className="font-display text-3xl font-bold mt-4 leading-tight">Pro Work<br />Setups</h3>
              <p className="text-slate-700 text-sm mt-2">Elevate your mobile productivity.</p>
              <Button
                onClick={() => { setActiveCategory("HOLDER"); window.scrollTo({ top: 400, behavior: "smooth" }); }}
                className="mt-auto w-fit bg-black hover:bg-black/80 text-white rounded-full"
              >
                View Details
              </Button>
            </div>
            {/* Black */}
            <div className="rounded-2xl p-6 bg-[#0b0b12] text-white relative overflow-hidden min-h-[220px] flex flex-col">
              <span className="inline-block bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-semibold w-fit">LIMITED OFFER</span>
              <h3 className="font-display text-3xl font-bold mt-4 leading-tight">Flash<br />Clearance</h3>
              <p className="text-white/70 text-sm mt-2">Up to 60% off favorites.</p>
              <Button
                onClick={() => { setActiveCategory("Tempered"); window.scrollTo({ top: 400, behavior: "smooth" }); }}
                className="mt-auto w-fit bg-orange-500 hover:bg-orange-600 text-white rounded-full"
              >
                Shop Deals
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default OrderNow;
