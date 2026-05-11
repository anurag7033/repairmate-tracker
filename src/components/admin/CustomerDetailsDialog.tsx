import { useEffect, useState } from "react";
import { Edit, Save, X, Phone, Mail, MapPin, FileText, Printer, ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Customer } from "@/types/customer";
import { RepairOrder, STATUS_LABELS } from "@/types/repair";
import { getCustomerById, updateCustomer, getRepairsByCustomerId } from "@/lib/customerStore";

interface Props {
  customerId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

const CustomerDetailsDialog = ({ customerId, onClose, onChanged }: Props) => {
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [repairs, setRepairs] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Customer | null>(null);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    setLoading(true);
    setEditing(false);
    Promise.all([getCustomerById(customerId), getRepairsByCustomerId(customerId)])
      .then(([c, r]) => {
        if (cancelled) return;
        setCustomer(c);
        setDraft(c);
        setRepairs(r);
      })
      .catch((e) => toast({ title: "Error", description: e.message, variant: "destructive" }))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [customerId]);

  const handleSave = async () => {
    if (!draft || !customer) return;
    try {
      await updateCustomer(customer.id, draft);
      toast({ title: "Saved", description: "Customer updated." });
      setCustomer(draft);
      setEditing(false);
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const totalSpent = repairs
    .filter((r) => r.paymentStatus === "paid")
    .reduce((s, r) => s + Math.max(r.quotation - r.discountAmount, 0), 0);

  const statusPill = (status: RepairOrder["status"]) => {
    if (status === "delivered") return "bg-success text-success-foreground";
    if (status === "returned") return "bg-destructive/10 text-destructive";
    if (status === "completed") return "bg-success/10 text-success";
    return "bg-secondary/10 text-secondary";
  };
  const paymentPill = (p: RepairOrder["paymentStatus"]) =>
    p === "paid" ? "bg-success/10 text-success" : p === "partial" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground";

  return (
    <Dialog open={!!customerId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center justify-between">
            <span>Customer Details</span>
            {customer && !editing && (
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setEditing(true)}>
                <Edit className="w-3 h-3 mr-1" />Edit
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading || !customer || !draft ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : (
          <div className="space-y-5">
            {/* Profile */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="rounded-lg mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className="rounded-lg mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="rounded-lg mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Address</Label>
                    <Textarea value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} className="rounded-lg mt-1" rows={2} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Notes</Label>
                    <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="rounded-lg mt-1" rows={2} />
                  </div>
                  <div className="sm:col-span-2 flex gap-2 justify-end">
                    <Button variant="outline" className="rounded-lg" onClick={() => { setDraft(customer); setEditing(false); }}>
                      <X className="w-3 h-3 mr-1" />Cancel
                    </Button>
                    <Button className="rounded-lg gradient-primary" onClick={handleSave}>
                      <Save className="w-3 h-3 mr-1" />Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="font-display text-xl font-bold">{customer.name || "(unnamed)"}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{customer.phone}</div>
                    {customer.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" />{customer.email}</div>}
                    {customer.address && <div className="flex items-start gap-2 sm:col-span-2"><MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />{customer.address}</div>}
                    {customer.notes && <div className="flex items-start gap-2 sm:col-span-2"><FileText className="w-4 h-4 text-muted-foreground mt-0.5" />{customer.notes}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-card border border-border text-center">
                <div className="text-xs text-muted-foreground">Total Repairs</div>
                <div className="font-display text-2xl font-bold text-primary">{repairs.length}</div>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border text-center">
                <div className="text-xs text-muted-foreground">Pending</div>
                <div className="font-display text-2xl font-bold text-warning">
                  {repairs.filter((r) => !["delivered", "returned"].includes(r.status)).length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border text-center">
                <div className="text-xs text-muted-foreground">Total Spent</div>
                <div className="font-display text-2xl font-bold text-success">₹{totalSpent.toLocaleString("en-IN")}</div>
              </div>
            </div>

            {/* Repair history */}
            <div>
              <h4 className="font-semibold mb-2">Repair History</h4>
              {repairs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No repairs yet.</p>
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2">Tracking</th>
                          <th className="text-left px-3 py-2">Device</th>
                          <th className="text-left px-3 py-2">Issue</th>
                          <th className="text-left px-3 py-2">Status</th>
                          <th className="text-left px-3 py-2">Payment</th>
                          <th className="text-left px-3 py-2">Date</th>
                          <th className="text-right px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {repairs.map((r) => (
                          <tr key={r.id} className="border-t border-border">
                            <td className="px-3 py-2 font-mono font-semibold text-primary">{r.trackingId}</td>
                            <td className="px-3 py-2">{r.mobileBrand} {r.mobileModel}</td>
                            <td className="px-3 py-2 max-w-[160px] truncate">{r.issueDescription || "—"}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full font-semibold ${statusPill(r.status)}`}>
                                {r.status === "delivered" ? "Completed" : STATUS_LABELS[r.status]}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full font-semibold ${paymentPill(r.paymentStatus)}`}>
                                {r.paymentStatus === "paid" ? "Paid" : r.paymentStatus === "partial" ? "Partial" : "Pending"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="outline" className="rounded-lg h-7 px-2" onClick={() => window.open(`/track/${r.trackingId}`, "_blank")}>
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                                {r.status === "delivered" && r.paymentStatus === "paid" && (
                                  <Button size="sm" variant="outline" className="rounded-lg h-7 px-2" onClick={() => window.open(`/invoice/${r.trackingId}`, "_blank")}>
                                    <Printer className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailsDialog;
