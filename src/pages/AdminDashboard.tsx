import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, LogOut, Search, MessageCircle, Trash2,
  Edit, ExternalLink, Phone, Smartphone
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import {
  getOrders, addOrder, updateOrder, deleteOrder, generateTrackingId, getWhatsAppLink
} from "@/lib/repairStore";
import { supabase } from "@/integrations/supabase/client";
import {
  RepairOrder, RepairStatus, PaymentStatus, STATUS_LABELS, STATUS_ORDER
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
  paymentStatus: "pending",
  paymentLink: "",
});

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Partial<RepairOrder> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin");
        return;
      }
      await refreshOrders();
      setLoading(false);
    };
    checkAuth();
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

    try {
      if (isEditing && editingOrder.id) {
        await updateOrder(editingOrder as RepairOrder);
        toast({ title: "Updated", description: "Repair order updated successfully." });
      } else {
        const newOrder = await addOrder({
          ...editingOrder as any,
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

  const sendWhatsApp = (order: RepairOrder) => {
    const msg = `Hello ${order.customerName},\n\nYour mobile repair update:\n📱 ${order.mobileBrand} ${order.mobileModel}\n🔖 Tracking ID: ${order.trackingId}\n📊 Status: ${STATUS_LABELS[order.status]}\n💰 Quotation: ₹${order.quotation}\n💳 Payment: ${order.paymentStatus}\n\n${order.status === "completed" && order.paymentLink ? `Pay here: ${order.paymentLink}` : ""}\n\nTrack online: ${window.location.origin}/track/${order.trackingId}\n\nThank you for choosing Anurag Mobile Repairing Centre!`;
    window.open(getWhatsAppLink(order.customerPhone, msg), "_blank");
  };

  const filtered = orders.filter(
    (o) =>
      o.trackingId.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.mobileModel.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
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
                    <Input value={editingOrder.imeiNumber || ""} onChange={(e) => setEditingOrder({ ...editingOrder, imeiNumber: e.target.value })} className="rounded-lg mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Issue Description</Label>
                    <Textarea value={editingOrder.issueDescription || ""} onChange={(e) => setEditingOrder({ ...editingOrder, issueDescription: e.target.value })} className="rounded-lg mt-1" rows={2} />
                  </div>
                  <div>
                    <Label className="text-xs">Repair Details</Label>
                    <Textarea value={editingOrder.repairDetails || ""} onChange={(e) => setEditingOrder({ ...editingOrder, repairDetails: e.target.value })} className="rounded-lg mt-1" rows={2} />
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Quotation (₹)</Label>
                      <Input type="number" value={editingOrder.quotation || 0} onChange={(e) => setEditingOrder({ ...editingOrder, quotation: Number(e.target.value) })} className="rounded-lg mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Payment Link</Label>
                      <Input value={editingOrder.paymentLink || ""} onChange={(e) => setEditingOrder({ ...editingOrder, paymentLink: e.target.value })} placeholder="https://..." className="rounded-lg mt-1" />
                    </div>
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
            {filtered.map((order) => (
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
                  <div>
                    💳{" "}
                    <span className={order.paymentStatus === "paid" ? "text-success font-medium" : "text-warning font-medium"}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
