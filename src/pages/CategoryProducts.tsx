import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, ShoppingCart, ChevronRight, Menu, Heart, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Footer from "@/components/Footer";
import CartIconButton from "@/components/shop/CartIconButton";
import logo from "@/assets/logo.png";
import { getProducts } from "@/lib/productStore";
import { Product, stockStatusOf } from "@/types/product";

type PriceBucket = "u500" | "500-1000" | "1000-2000" | "2000+";

const PRICE_BUCKETS: { id: PriceBucket; label: string; test: (n: number) => boolean }[] = [
  { id: "u500", label: "Under ₹500", test: (n) => n < 500 },
  { id: "500-1000", label: "₹500 – ₹1,000", test: (n) => n >= 500 && n < 1000 },
  { id: "1000-2000", label: "₹1,000 – ₹2,000", test: (n) => n >= 1000 && n < 2000 },
  { id: "2000+", label: "₹2,000 & Above", test: (n) => n >= 2000 },
];

const PAGE_SIZE = 16;

const CategoryProducts = () => {
  const { category = "" } = useParams();
  const navigate = useNavigate();
  const [all, setAll] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [topSearch, setTopSearch] = useState("");
  const [priceFilters, setPriceFilters] = useState<Set<PriceBucket>>(new Set());
  const [brandFilters, setBrandFilters] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"popularity" | "price_asc" | "price_desc" | "newest">("popularity");
  const [page, setPage] = useState(1);

  const catName = decodeURIComponent(category);

  useEffect(() => {
    (async () => {
      try {
        const list = await getProducts();
        setAll(list.filter((p) => p.status === "active" && p.category.toLowerCase() === catName.toLowerCase()));
      } finally {
        setLoading(false);
      }
    })();
  }, [catName]);

  const brands = useMemo(() => {
    const s = new Set<string>();
    all.forEach((p) => p.brand && s.add(p.brand));
    return Array.from(s).sort();
  }, [all]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = all.filter((p) => {
      if (q && !`${p.name} ${p.brand} ${p.productCode}`.toLowerCase().includes(q)) return false;
      if (brandFilters.size > 0 && !brandFilters.has(p.brand)) return false;
      if (priceFilters.size > 0) {
        const ok = Array.from(priceFilters).some((k) => PRICE_BUCKETS.find((b) => b.id === k)!.test(p.finalPrice));
        if (!ok) return false;
      }
      return true;
    });
    if (sortBy === "price_asc") list = [...list].sort((a, b) => a.finalPrice - b.finalPrice);
    else if (sortBy === "price_desc") list = [...list].sort((a, b) => b.finalPrice - a.finalPrice);
    else if (sortBy === "newest") list = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return list;
  }, [all, search, brandFilters, priceFilters, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, brandFilters, priceFilters, sortBy]);

  const toggle = <T,>(set: Set<T>, v: T, setter: (s: Set<T>) => void) => {
    const n = new Set(set);
    n.has(v) ? n.delete(v) : n.add(v);
    setter(n);
  };

  const clearAll = () => {
    setSearch("");
    setPriceFilters(new Set());
    setBrandFilters(new Set());
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(240_20%_97%)]">
      <Helmet>
        <title>{catName} – Anurag Mobile</title>
        <meta name="description" content={`Shop ${catName} at Anurag Mobile. Premium accessories with fast delivery.`} />
      </Helmet>

      {/* Top Dark Nav */}
      <header className="bg-[#0b0b12] text-white sticky top-0 z-40">
        <div className="container mx-auto flex items-center gap-4 py-4">
          <button className="md:hidden" aria-label="Menu"><Menu className="w-5 h-5" /></button>
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Anurag Mobile" className="w-8 h-8 rounded-md" />
            <span className="font-display font-bold text-lg">Anurag Mobile</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 ml-6 text-sm">
            <Link to="/" className="hover:text-orange-400">Home</Link>
            <Link to="/order-now" className="text-orange-500 border-b-2 border-orange-500 pb-0.5">Categories</Link>
            <a href="#" className="hover:text-orange-400">Offers</a>
            <Link to="/cart" className="hover:text-orange-400">Cart</Link>
          </nav>
          <div className="flex-1" />
          <button aria-label="Search" className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center"><Search className="w-5 h-5" /></button>
          <CartIconButton variant="dark" />
        </div>
      </header>

      <main className="container mx-auto py-8 flex-1">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/order-now" className="hover:text-foreground">Accessories</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium capitalize">{catName.toLowerCase()}</span>
        </nav>

        <h1 className="font-display text-3xl md:text-4xl font-bold capitalize">{catName.toLowerCase()}</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">Explore our range of {catName.toLowerCase()} — engineered for reliability, style, and everyday performance.</p>

        <div className="grid lg:grid-cols-[260px_1fr] gap-6 mt-8">
          {/* Filters */}
          <aside className="bg-card border border-border rounded-2xl p-5 h-fit lg:sticky lg:top-24">
            <h2 className="font-display text-xl font-bold mb-4">Filters</h2>
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="pl-9 h-10 rounded-full bg-muted/50" />
            </div>

            <div className="mb-5">
              <p className="font-semibold mb-2">Price Range</p>
              <div className="space-y-2">
                {PRICE_BUCKETS.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={priceFilters.has(b.id)} onCheckedChange={() => toggle(priceFilters, b.id, setPriceFilters)} />
                    {b.label}
                  </label>
                ))}
              </div>
            </div>

            {brands.length > 0 && (
              <div className="mb-5">
                <p className="font-semibold mb-2">Brand</p>
                <div className="space-y-2 max-h-48 overflow-auto">
                  {brands.map((b) => (
                    <label key={b} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={brandFilters.has(b)} onCheckedChange={() => toggle(brandFilters, b, setBrandFilters)} />
                      {b}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={clearAll} className="w-full bg-[#0b0b12] hover:bg-black text-white rounded-full">Clear All</Button>
          </aside>

          {/* Products */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm"><span className="font-bold text-lg">{filtered.length}</span> <span className="text-muted-foreground">Products Found</span></p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground uppercase text-xs">Sort By:</span>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-40 h-9 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popularity">Popularity</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-muted rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : pageItems.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border rounded-2xl text-muted-foreground">No products match your filters.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {pageItems.map((p) => {
                  const s = stockStatusOf(p);
                  const hasDiscount = p.sellingPrice > p.finalPrice;
                  const off = hasDiscount ? Math.round(((p.sellingPrice - p.finalPrice) / p.sellingPrice) * 100) : 0;
                  return (
                    <article key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-card group">
                      <Link to={`/order-now/product/${p.id}`} className="block relative aspect-square bg-muted overflow-hidden">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                        )}
                        {hasDiscount && (
                          <span className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">-{off}% OFF</span>
                        )}
                        {s === "low_stock" && (
                          <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">LOW STOCK</span>
                        )}
                        {s === "out_of_stock" && (
                          <span className="absolute top-3 left-3 bg-slate-700 text-white text-xs font-bold px-2 py-1 rounded">OUT OF STOCK</span>
                        )}
                        <button aria-label="Wishlist" className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white" onClick={(e) => e.preventDefault()}>
                          <Heart className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </Link>
                      <div className="p-4">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{p.brand || "Anurag Mobile"}</p>
                        <Link to={`/order-now/product/${p.id}`}>
                          <h3 className="font-semibold text-base leading-snug mt-1 line-clamp-2 min-h-[2.75rem] hover:text-orange-600 transition-colors">{p.name}</h3>
                        </Link>
                        <div className="flex items-baseline gap-2 mt-3">
                          <span className="font-bold text-lg text-orange-600">₹{p.finalPrice.toLocaleString("en-IN")}</span>
                          {hasDiscount && <span className="text-sm text-muted-foreground line-through">₹{p.sellingPrice.toLocaleString("en-IN")}</span>}
                        </div>
                        <Button asChild disabled={s === "out_of_stock"} className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-11">
                          <Link to={`/order-now/product/${p.id}`}>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            {s === "out_of_stock" ? "Unavailable" : "View Details"}
                          </Link>
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="w-10 h-10 rounded-lg bg-card border border-border disabled:opacity-40">‹</button>
                {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
                  const n = i + 1;
                  return (
                    <button key={n} onClick={() => setPage(n)} className={`w-10 h-10 rounded-lg font-semibold ${page === n ? "bg-[#0b0b12] text-white" : "bg-card border border-border"}`}>{n}</button>
                  );
                })}
                {totalPages > 5 && <span className="px-2">…</span>}
                {totalPages > 5 && (
                  <button onClick={() => setPage(totalPages)} className={`w-10 h-10 rounded-lg font-semibold ${page === totalPages ? "bg-[#0b0b12] text-white" : "bg-card border border-border"}`}>{totalPages}</button>
                )}
                <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="w-10 h-10 rounded-lg bg-card border border-border disabled:opacity-40">›</button>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoryProducts;
