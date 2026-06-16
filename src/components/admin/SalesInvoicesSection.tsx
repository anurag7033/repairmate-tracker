import { useEffect, useMemo, useState } from "react";
import {
  Plus, Search, Trash2, Loader2, FileText, X, Receipt, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import CustomerPickerField from "@/components/admin/CustomerPickerField";
import SalesInvoicePrint from "@/components/admin/SalesInvoicePrint";
import SalesInvoiceView from "@/components/admin/SalesInvoiceView";
import { Customer } from "@/types/customer";
import { Product } from "@/types/product";
import { getProducts } from "@/lib/productStore";
import {
  SalesInvoice, SalesPaymentMethod, PAYMENT_METHOD_LABELS,
} from "@/types/salesInvoice";
import {
  getSalesInvoices, createSalesInvoice, deleteSalesInvoice, computeTotals,
  getSalesInvoiceById,
} from "@/lib/salesInvoiceStore";
import { createCustomer } from "@/lib/customerStore";

interface DraftItem {
  productId: string | null;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  purchasePrice: number;
  availableStock: number;
}

const emptyDraft = () => ({
  customer: null as Customer | null,
  customerName: "",
  customerPhone: "",
  customerAltPhone: "",
  customerEmail: "",
  customerAddress: "",
  customerGst: "",
  items: [] as DraftItem[],
  invoiceDiscount: 0,
  gstPercent: 0,
  amountReceived: 0,
  paymentMethod: "cash" as SalesPaymentMethod,
  notes: "",
});

const paymentBadge = (s: string) => {
  if (s === "paid") return "bg-success/10 text-success border-success/30";
  if (s === "partial") return "bg-warning/10 text-warning border-warning/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
};

const SalesInvoicesSection = () => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());
  const [productQuery, setProductQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<SalesInvoice | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const [inv, prods] = await Promise.all([getSalesInvoices(), getProducts()]);
      setInvoices(inv);
      setProducts(prods);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((i) =>
      i.invoiceNumber.toLowerCase().includes(q) ||
      i.customerName.toLowerCase().includes(q) ||
      i.customerPhone.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const productMatches = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.status === "active" &&
        (p.name.toLowerCase().includes(q) || p.productCode.toLowerCase().includes(q))
      ).slice(0, 8);
  }, [productQuery, products]);

  const totals = useMemo(() => computeTotals({
    items: draft.items.map((i) => ({
      productId: i.productId, productCode: i.productCode, productName: i.productName,
      quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount, purchasePrice: i.purchasePrice,
    })),
    invoiceDiscount: draft.invoiceDiscount,
    gstPercent: draft.gstPercent,
    amountReceived: draft.amountReceived,
  }), [draft]);

  const openNew = () => {
    setDraft(emptyDraft());
    setProductQuery("");
    setDialogOpen(true);
  };

  const handleCustomerSelect = (c: Customer) => {
    setDraft((d) => ({
      ...d,
      customer: c,
      customerName: c.name,
      customerPhone: c.phone,
      customerEmail: c.email || "",
      customerAddress: c.address || "",
    }));
  };

  const addProductToInvoice = (p: Product) => {
    setDraft((d) => {
      const existing = d.items.find((i) => i.productId === p.id);
      if (existing) {
        return {
          ...d,
          items: d.items.map((i) =>
            i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      const unitPrice = p.finalPrice > 0 ? p.finalPrice : p.sellingPrice;
      return {
        ...d,
        items: [...d.items, {
          productId: p.id,
          productCode: p.productCode,
          productName: p.name,
          quantity: 1,
          unitPrice,
          discount: 0,
          purchasePrice: p.purchasePrice || 0,
          availableStock: p.stockQuantity,
        }],
      };
    });
    setProductQuery("");
  };

  const updateItem = (idx: number, patch: Partial<DraftItem>) => {
    setDraft((d) => ({
      ...d,
      items: d.items.map((it, i) => i === idx ? { ...it, ...patch } : it),
    }));
  };

  const removeItem = (idx: number) => {
    setDraft((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!draft.customerName.trim() || !draft.customerPhone.trim()) {
      toast({ title: "Customer required", description: "Add customer name and phone.", variant: "destructive" });
      return;
    }
    if (draft.items.length === 0) {
      toast({ title: "No products", description: "Add at least one product.", variant: "destructive" });
      return;
    }
    for (const it of draft.items) {
      if (it.availableStock > 0 && it.quantity > it.availableStock) {
        toast({ title: "Stock error", description: `${it.productName}: only ${it.availableStock} in stock.`, variant: "destructive" });
        return;
      }
      if (it.quantity <= 0) {
        toast({ title: "Quantity error", description: `${it.productName}: quantity must be > 0.`, variant: "destructive" });
        return;
      }
    }
    try {
      setSaving(true);
      let customerId = draft.customer?.id || null;
      if (!customerId) {
        try {
          const c = await createCustomer({
            name: draft.customerName,
            phone: draft.customerPhone,
            email: draft.customerEmail,
            address: draft.customerAddress,
          });
          customerId = c.id;
        } catch {/* non-fatal */}
      }
      const inv = await createSalesInvoice({
        customerId,
        customerName: draft.customerName,
        customerPhone: draft.customerPhone,
        customerAltPhone: draft.customerAltPhone,
        customerEmail: draft.customerEmail,
        customerAddress: draft.customerAddress,
        customerGst: draft.customerGst,
        invoiceDiscount: draft.invoiceDiscount,
        gstPercent: draft.gstPercent,
        amountReceived: draft.amountReceived,
        paymentMethod: draft.paymentMethod,
        notes: draft.notes,
        items: draft.items.map((i) => ({
          productId: i.productId,
          productCode: i.productCode,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          purchasePrice: i.purchasePrice,
        })),
      });
      toast({ title: "Invoice created", description: inv.invoiceNumber });
      setDialogOpen(false);
      await refresh();
      // open detail view
      const full = await getSalesInvoiceById(inv.id);
      if (full) setViewInvoice(full);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleView = async (id: string) => {
    try {
      const full = await getSalesInvoiceById(id);
      if (full) setViewInvoice(full);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSalesInvoice(id);
      toast({ title: "Invoice deleted" });
      refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice #, customer name or phone..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <Button onClick={openNew} className="h-11 rounded-xl font-semibold gradient-primary">
          <Plus className="w-4 h-4 mr-2" /> New Invoice
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading invoices...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{invoices.length === 0 ? "No sales invoices yet. Create your first one." : "No invoices match your search."}</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-3">Invoice #</th>
                  <th className="text-left px-3 py-3">Customer</th>
                  <th className="text-left px-3 py-3">Items</th>
                  <th className="text-left px-3 py-3">Total</th>
                  <th className="text-left px-3 py-3">Profit</th>
                  <th className="text-left px-3 py-3">Method</th>
                  <th className="text-left px-3 py-3">Status</th>
                  <th className="text-left px-3 py-3">Date</th>
                  <th className="text-right px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-3 font-mono font-semibold text-primary">{i.invoiceNumber}</td>
                    <td className="px-3 py-3">
                      <div className="font-semibold">{i.customerName}</div>
                      <div className="text-xs text-muted-foreground">{i.customerPhone}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">—</td>
                    <td className="px-3 py-3 font-semibold">₹{i.grandTotal.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-3 font-semibold text-success">₹{i.totalProfit.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-3 text-xs">{PAYMENT_METHOD_LABELS[i.paymentMethod]}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${paymentBadge(i.paymentStatus)}`}>
                        {i.paymentStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {new Date(i.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" className="rounded-lg h-8 px-2" onClick={() => handleView(i.id)}>
                          <Eye className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="rounded-lg h-8 px-2 text-destructive border-destructive/30">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete invoice {i.invoiceNumber}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes the invoice. Stock is NOT restored automatically.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDelete(i.id)}
                              >Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileText className="w-5 h-5" /> New Sales Invoice
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Customer */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <Label className="text-xs font-semibold">Customer</Label>
              <CustomerPickerField
                value={draft.customer}
                onSelect={handleCustomerSelect}
                onClear={() => setDraft((d) => ({ ...d, customer: null, customerName: "", customerPhone: "", customerEmail: "", customerAddress: "" }))}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input value={draft.customerName} onChange={(e) => setDraft({ ...draft, customerName: e.target.value })} className="rounded-lg mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Mobile *</Label>
                  <Input value={draft.customerPhone} onChange={(e) => setDraft({ ...draft, customerPhone: e.target.value })} className="rounded-lg mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Alt. Mobile</Label>
                  <Input value={draft.customerAltPhone} onChange={(e) => setDraft({ ...draft, customerAltPhone: e.target.value })} className="rounded-lg mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={draft.customerEmail} onChange={(e) => setDraft({ ...draft, customerEmail: e.target.value })} className="rounded-lg mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Address</Label>
                  <Input value={draft.customerAddress} onChange={(e) => setDraft({ ...draft, customerAddress: e.target.value })} className="rounded-lg mt-1" />
                </div>
                <div>
                  <Label className="text-xs">GST Number (Optional)</Label>
                  <Input value={draft.customerGst} onChange={(e) => setDraft({ ...draft, customerGst: e.target.value })} className="rounded-lg mt-1" />
                </div>
              </div>
            </div>

            {/* Product search & add */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold">Add Products</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product name or code..."
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  className="pl-10 rounded-lg"
                />
                {productMatches.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    {productMatches.map((p) => (
                      <button
                        key={p.id} type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b border-border last:border-0"
                        onClick={() => addProductToInvoice(p)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold">{p.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{p.productCode} • Stock: {p.stockQuantity}</div>
                          </div>
                          <div className="text-sm font-bold text-primary">₹{(p.finalPrice || p.sellingPrice).toLocaleString("en-IN")}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items list */}
              {draft.items.length > 0 && (
                <div className="bg-card border border-border rounded-xl overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="text-left px-2 py-2">Product</th>
                        <th className="text-left px-2 py-2 w-20">Qty</th>
                        <th className="text-left px-2 py-2 w-24">Price</th>
                        <th className="text-left px-2 py-2 w-24">Discount</th>
                        <th className="text-left px-2 py-2 w-24">Total</th>
                        <th className="px-2 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.items.map((it, idx) => {
                        const total = Math.max(0, it.quantity * it.unitPrice - it.discount);
                        return (
                          <tr key={idx} className="border-t border-border">
                            <td className="px-2 py-2">
                              <div className="font-semibold">{it.productName}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{it.productCode}{it.availableStock > 0 ? ` • Stock: ${it.availableStock}` : ""}</div>
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" min={1} value={it.quantity}
                                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                                className="h-8 rounded-md" />
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" min={0} value={it.unitPrice}
                                onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) || 0 })}
                                className="h-8 rounded-md" />
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" min={0} value={it.discount}
                                onChange={(e) => updateItem(idx, { discount: Number(e.target.value) || 0 })}
                                className="h-8 rounded-md" />
                            </td>
                            <td className="px-2 py-2 font-semibold">₹{total.toLocaleString("en-IN")}</td>
                            <td className="px-2 py-2">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeItem(idx)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Adjustments */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Additional Invoice Discount (₹)</Label>
                <Input type="number" min={0} value={draft.invoiceDiscount}
                  onChange={(e) => setDraft({ ...draft, invoiceDiscount: Number(e.target.value) || 0 })}
                  className="rounded-lg mt-1" />
              </div>
              <div>
                <Label className="text-xs">GST %</Label>
                <Input type="number" min={0} value={draft.gstPercent}
                  onChange={(e) => setDraft({ ...draft, gstPercent: Number(e.target.value) || 0 })}
                  className="rounded-lg mt-1" />
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={draft.paymentMethod} onValueChange={(v) => setDraft({ ...draft, paymentMethod: v as SalesPaymentMethod })}>
                  <SelectTrigger className="rounded-lg mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Totals */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{totals.subtotal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Product Discounts</span><span>− ₹{totals.productDiscountTotal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Invoice Discount</span><span>− ₹{draft.invoiceDiscount.toLocaleString("en-IN")}</span></div>
              {totals.gstAmount > 0 && (
                <div className="flex justify-between"><span>GST ({draft.gstPercent}%)</span><span>+ ₹{totals.gstAmount.toLocaleString("en-IN")}</span></div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-primary/20">
                <span>Grand Total</span><span className="text-primary">₹{totals.grandTotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <Label className="text-xs">Amount Received</Label>
                  <Input type="number" min={0} value={draft.amountReceived}
                    onChange={(e) => setDraft({ ...draft, amountReceived: Number(e.target.value) || 0 })}
                    className="rounded-lg mt-1" />
                </div>
                <div className="text-right pt-5">
                  {totals.changeReturned > 0 && (
                    <div className="text-sm">Change to Return: <span className="font-bold text-warning">₹{totals.changeReturned.toLocaleString("en-IN")}</span></div>
                  )}
                  {totals.remainingAmount > 0 && (
                    <div className="text-sm">Remaining: <span className="font-bold text-destructive">₹{totals.remainingAmount.toLocaleString("en-IN")}</span></div>
                  )}
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${paymentBadge(totals.paymentStatus)}`}>
                    {totals.paymentStatus.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="text-xs text-success font-semibold pt-2 border-t border-primary/10">
                Estimated Profit: ₹{totals.totalProfit.toLocaleString("en-IN")} (admin only)
              </div>
            </div>

            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="rounded-lg mt-1" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl font-semibold gradient-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Receipt className="w-4 h-4 mr-2" />}
              Create Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View / Print / Pay / Share */}
      <Dialog open={!!viewInvoice} onOpenChange={(o) => !o && setViewInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl print:max-w-full print:max-h-none print:overflow-visible print:border-0 print:p-0 print:rounded-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle className="font-display">
              Invoice {viewInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <SalesInvoiceView
              invoice={viewInvoice}
              onUpdated={(inv) => {
                setViewInvoice(inv);
                refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesInvoicesSection;
