import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, LogOut, Search, MessageCircle, Trash2,
  Edit, ExternalLink, Phone, Smartphone, ChevronDown, Ticket, Send,
} from "lucide-react";
import AdminVoucherSection from "@/components/AdminVoucherSection";
import BarcodeScanner from "@/components/BarcodeScanner";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  getOrders, addOrder, updateOrder, deleteOrder, generateTrackingId, getWhatsAppLink, createVoucher, getVouchersForOrder
} from "@/lib/repairStore";
import { supabase } from "@/integrations/supabase/client";
import {
  RepairOrder, RepairStatus, PaymentStatus, STATUS_LABELS, STATUS_ORDER, COMMON_ISSUES, COMMON_REPAIRS
} from "@/types/repair";

const emptyOrder = (): Partial<RepairOrder> => ({
  customerName: "",
  customerPhone: "",
  mobileBrand: "",
  mobileModel: "",
  imeiNumber: "",
  issueDescription: "",
  repairDetails: "",
  status: "received",
  quotation: 0,
  advancePaid: 0,
  paymentStatus: "pending",
  paymentLink: "",
});

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"repairs" | "vouchers">("repairs");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Partial<RepairOrder> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  
  // Voucher state
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [voucherOrder, setVoucherOrder] = useState<RepairOrder | null>(null);
  const [voucherAmount, setVoucherAmount] = useState(0);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [orderVouchers, setOrderVouchers] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin", { replace: true });
        return;
      }
      if (isMounted) {
        setAuthenticated(true);
        await refreshOrders();
        setLoading(false);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && isMounted) {
        setAuthenticated(false);
        navigate("/admin", { replace: true });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const refreshOrders = async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!editingOrder) return;
    if (!editingOrder.customerName || !editingOrder.customerPhone || !editingOrder.mobileBrand || !editingOrder.mobileModel) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    // Auto-update payment status based on advance paid
    let paymentStatus = editingOrder.paymentStatus || "pending";
    const quotation = editingOrder.quotation || 0;
    const advancePaid = editingOrder.advancePaid || 0;
    
    if (advancePaid >= quotation && quotation > 0) {
      paymentStatus = "paid";
    } else if (advancePaid > 0) {
      paymentStatus = "partial";
    }

    try {
      if (isEditing && editingOrder.id) {
        await updateOrder({ ...editingOrder, paymentStatus } as RepairOrder);
        toast({ title: "Updated", description: "Repair order updated successfully." });
      } else {
        const newOrder = await addOrder({
          ...editingOrder as any,
          paymentStatus,
          trackingId: generateTrackingId(),
        });
        toast({ title: "Created", description: `Tracking ID: ${newOrder.trackingId}` });
      }
      setDialogOpen(false);
      setEditingOrder(null);
      await refreshOrders();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteOrder(id);
      await refreshOrders();
      toast({ title: "Deleted", description: "Order removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = (order: RepairOrder) => {
    setEditingOrder({ ...order });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingOrder(emptyOrder());
    setIsEditing(false);
    setDialogOpen(true);
  };

  const addIssueToDescription = (issue: string) => {
    if (!editingOrder) return;
    const current = editingOrder.issueDescription || "";
    const newDesc = current ? `${current}, ${issue}` : issue;
    setEditingOrder({ ...editingOrder, issueDescription: newDesc });
  };

  const addRepairToDetails = (repair: string) => {
    if (!editingOrder) return;
    const current = editingOrder.repairDetails || "";
    const newDetails = current ? `${current}, ${repair}` : repair;
    setEditingOrder({ ...editingOrder, repairDetails: newDetails });
  };

  const sendWhatsApp = (order: RepairOrder) => {
    const balanceDue = order.quotation - order.advancePaid - order.discountAmount;
    const msg = `Hello ${order.customerName},\n\nYour mobile repair update:\n📱 ${order.mobileBrand} ${order.mobileModel}\n🔖 Tracking ID: ${order.trackingId}\n📊 Status: ${STATUS_LABELS[order.status]}\n💰 Total: ₹${order.quotation}${order.discountAmount > 0 ? `\n🎟️ Discount: -₹${order.discountAmount}` : ""}\n💵 Advance Paid: ₹${order.advancePaid}\n💳 Balance Due: ₹${balanceDue}\n\n${order.status === "completed" && order.paymentLink && balanceDue > 0 ? `Pay here: ${order.paymentLink}` : ""}\n\nTrack online: ${window.location.origin}/track/${order.trackingId}\n\nThank you for choosing Anurag Mobile Repairing Centre!`;
    window.open(getWhatsAppLink(order.customerPhone, msg), "_blank");
  };

  const openVoucherDialog = async (order: RepairOrder) => {
    setVoucherOrder(order);
    setVoucherAmount(0);
    setVoucherDialogOpen(true);
    try {
      const vouchers = await getVouchersForOrder(order.trackingId);
      setOrderVouchers(vouchers);
    } catch {
      setOrderVouchers([]);
    }
  };

  const handleCreateVoucher = async () => {
    if (!voucherOrder || voucherAmount <= 0) {
      toast({ title: "Invalid", description: "Enter a valid discount amount.", variant: "destructive" });
      return;
    }
    setVoucherLoading(true);
    try {
      const voucher = await createVoucher(voucherOrder.trackingId, voucherAmount);
      toast({ title: "Voucher Created", description: `Code: ${voucher.voucher_code}` });
      
      // Send via WhatsApp
      const msg = `🎟️ *Discount Voucher from Anurag Mobile!*\n\nHello ${voucherOrder.customerName},\n\nYou've received a discount voucher!\n\n🎫 Voucher Code: *${voucher.voucher_code}*\n💰 Discount Amount: *₹${voucherAmount}*\n\n⚠️ *Note:* This voucher is valid for your *next repair* only. It cannot be used on the current repair.\n\nApply this code on your tracking page when you visit us next:\n${window.location.origin}/track\n\nThank you for choosing Anurag Mobile! 🙏`;
      window.open(getWhatsAppLink(voucherOrder.customerPhone, msg), "_blank");
      
      const vouchers = await getVouchersForOrder(voucherOrder.trackingId);
      setOrderVouchers(vouchers);
      setVoucherAmount(0);
      await refreshOrders();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setVoucherLoading(false);
    }
  };

  const filtered = orders.filter(
    (o) =>
      o.trackingId.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.mobileModel.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="gradient-hero text-primary-foreground sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-9 h-9 rounded-lg" />
            <span className="font-display text-lg font-bold">Anurag Mobile Admin</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/");
            }}
          >
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto py-6">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, tracking ID, or model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="h-11 gradient-primary hover:opacity-90 rounded-xl font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                New Repair
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">{isEditing ? "Edit Repair" : "New Repair Order"}</DialogTitle>
              </DialogHeader>
              {editingOrder && (
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Customer Name *</Label>
                      <Input value={editingOrder.customerName || ""} onChange={(e) => setEditingOrder({ ...editingOrder, customerName: e.target.value })} className="rounded-lg mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Phone (with country code) *</Label>
                      <Input value={editingOrder.customerPhone || ""} onChange={(e) => setEditingOrder({ ...editingOrder, customerPhone: e.target.value })} placeholder="919876543210" className="rounded-lg mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Brand *</Label>
                      <Input value={editingOrder.mobileBrand || ""} onChange={(e) => setEditingOrder({ ...editingOrder, mobileBrand: e.target.value })} className="rounded-lg mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Model *</Label>
                      <Input value={editingOrder.mobileModel || ""} onChange={(e) => setEditingOrder({ ...editingOrder, mobileModel: e.target.value })} className="rounded-lg mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">IMEI Number</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={editingOrder.imeiNumber || ""} onChange={(e) => setEditingOrder({ ...editingOrder, imeiNumber: e.target.value })} className="rounded-lg flex-1" placeholder="Scan or type IMEI" />
                      <BarcodeScanner onScan={(val) => setEditingOrder({ ...editingOrder, imeiNumber: val })} />
                    </div>
                  </div>
                  
                  {/* Issue Description with Quick Add */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Issue Description</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-6 text-xs rounded-md">
                            <Plus className="w-3 h-3 mr-1" />
                            Quick Add
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                          {COMMON_ISSUES.map((issue) => (
                            <DropdownMenuItem
                              key={issue}
                              onClick={() => addIssueToDescription(issue)}
                              className="cursor-pointer"
                            >
                              {issue}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <Textarea value={editingOrder.issueDescription || ""} onChange={(e) => setEditingOrder({ ...editingOrder, issueDescription: e.target.value })} className="rounded-lg" rows={2} placeholder="Select from quick add or type custom issue..." />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Repair Details</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-6 text-xs rounded-md">
                            <Plus className="w-3 h-3 mr-1" />
                            Quick Add
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                          {COMMON_REPAIRS.map((repair) => (
                            <DropdownMenuItem
                              key={repair}
                              onClick={() => addRepairToDetails(repair)}
                              className="cursor-pointer"
                            >
                              {repair}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <Textarea value={editingOrder.repairDetails || ""} onChange={(e) => setEditingOrder({ ...editingOrder, repairDetails: e.target.value })} className="rounded-lg" rows={2} placeholder="Select from quick add or type custom details..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={editingOrder.status} onValueChange={(v) => setEditingOrder({ ...editingOrder, status: v as RepairStatus })}>
                        <SelectTrigger className="rounded-lg mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_ORDER.map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Payment Status</Label>
                      <Select value={editingOrder.paymentStatus} onValueChange={(v) => setEditingOrder({ ...editingOrder, paymentStatus: v as PaymentStatus })}>
                        <SelectTrigger className="rounded-lg mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Payment Section */}
                  <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                    <Label className="text-xs font-semibold text-foreground">💰 Payment Details</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Total Quotation (₹)</Label>
                        <Input 
                          type="number" 
                          value={editingOrder.quotation || 0} 
                          onChange={(e) => setEditingOrder({ ...editingOrder, quotation: Number(e.target.value) })} 
                          className="rounded-lg mt-1" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Advance Paid (₹)</Label>
                        <Input 
                          type="number" 
                          value={editingOrder.advancePaid || 0} 
                          onChange={(e) => setEditingOrder({ ...editingOrder, advancePaid: Number(e.target.value) })} 
                          className="rounded-lg mt-1" 
                        />
                      </div>
                    </div>
                    {(editingOrder.quotation || 0) > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground">Balance Due</span>
                        <span className="font-bold text-primary">
                          ₹{(editingOrder.quotation || 0) - (editingOrder.advancePaid || 0)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-xs">Payment Link</Label>
                    <Input value={editingOrder.paymentLink || ""} onChange={(e) => setEditingOrder({ ...editingOrder, paymentLink: e.target.value })} placeholder="https://..." className="rounded-lg mt-1" />
                  </div>
                  
                  <Button onClick={handleSave} className="w-full h-11 gradient-primary hover:opacity-90 rounded-xl font-semibold">
                    {isEditing ? "Update Order" : "Create Order"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Orders */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No repair orders yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((order) => {
              const balanceDue = order.quotation - order.advancePaid - order.discountAmount;
              return (
                <div key={order.id} className="bg-card rounded-2xl p-5 shadow-card border border-border animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-display font-bold text-primary">{order.trackingId}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          order.status === "completed" || order.status === "delivered"
                            ? "bg-success/10 text-success"
                            : "bg-secondary/10 text-secondary"
                        }`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{order.customerName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => openEdit(order)}>
                        <Edit className="w-3 h-3 mr-1" />Edit
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-lg text-xs text-amber-600 border-amber-300 hover:bg-amber-50" onClick={() => openVoucherDialog(order)}>
                        <Ticket className="w-3 h-3 mr-1" />Voucher
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-lg text-xs text-success border-success/30 hover:bg-success/10" onClick={() => sendWhatsApp(order)}>
                        <MessageCircle className="w-3 h-3 mr-1" />WhatsApp
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => window.open(`/track/${order.trackingId}`, "_blank")}>
                        <ExternalLink className="w-3 h-3 mr-1" />View
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-lg text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDelete(order.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <div>📱 {order.mobileBrand} {order.mobileModel}</div>
                    <div><Phone className="w-3 h-3 inline mr-1" />{order.customerPhone}</div>
                    <div>💰 ₹{order.quotation}</div>
                    <div>💵 Adv: ₹{order.advancePaid}</div>
                    {order.discountAmount > 0 && (
                      <div className="text-amber-600">🎟️ Disc: -₹{order.discountAmount}</div>
                    )}
                    <div>
                      💳{" "}
                      <span className={
                        order.paymentStatus === "paid" 
                          ? "text-success font-medium" 
                          : order.paymentStatus === "partial"
                          ? "text-warning font-medium"
                          : "text-muted-foreground"
                      }>
                        {order.paymentStatus === "paid" ? "Paid" : order.paymentStatus === "partial" ? `Bal: ₹${balanceDue}` : "Pending"}
                      </span>
                    </div>
                    <div>📅 {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    <div>🕐 Updated: {new Date(order.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} {new Date(order.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Voucher Dialog */}
      <Dialog open={voucherDialogOpen} onOpenChange={setVoucherDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Generate Voucher
            </DialogTitle>
          </DialogHeader>
          {voucherOrder && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/50 rounded-xl text-sm">
                <p className="font-semibold">{voucherOrder.customerName}</p>
                <p className="text-muted-foreground text-xs">Tracking ID: {voucherOrder.trackingId} • {voucherOrder.mobileBrand} {voucherOrder.mobileModel}</p>
                <p className="text-xs text-muted-foreground mt-1">Balance: ₹{voucherOrder.quotation - voucherOrder.advancePaid - voucherOrder.discountAmount}</p>
              </div>

              <div>
                <Label className="text-xs">Discount Amount (₹)</Label>
                <Input
                  type="number"
                  value={voucherAmount || ""}
                  onChange={(e) => setVoucherAmount(Number(e.target.value))}
                  placeholder="Enter discount amount"
                  className="rounded-lg mt-1"
                />
              </div>

              <Button
                onClick={handleCreateVoucher}
                disabled={voucherLoading || voucherAmount <= 0}
                className="w-full h-11 gradient-primary hover:opacity-90 rounded-xl font-semibold"
              >
                <Send className="w-4 h-4 mr-2" />
                {voucherLoading ? "Creating..." : "Generate & Send via WhatsApp"}
              </Button>

              {/* Existing vouchers */}
              {orderVouchers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Previous Vouchers</Label>
                  {orderVouchers.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-xs gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-mono font-semibold">{v.voucher_code}</span>
                        <span className="ml-2 text-muted-foreground">₹{v.discount_amount}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!v.is_used && voucherOrder && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs rounded-md border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => {
                              const msg = `🎟️ *Discount Voucher from Anurag Mobile!*\n\nHello ${voucherOrder.customerName},\n\nYou've received a discount voucher!\n\n🎫 Voucher Code: *${v.voucher_code}*\n💰 Discount Amount: *₹${v.discount_amount}*\n\n⚠️ *Note:* This voucher is valid for your *next repair* only. It cannot be used on the current repair.\n\nApply this code on your tracking page when you visit us next:\n${window.location.origin}/track\n\nThank you for choosing Anurag Mobile! 🙏`;
                              window.open(getWhatsAppLink(voucherOrder.customerPhone, msg), "_blank");
                            }}
                          >
                            <Send className="w-3 h-3 mr-1" />Send
                          </Button>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.is_used ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {v.is_used ? "Used" : "Active"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
