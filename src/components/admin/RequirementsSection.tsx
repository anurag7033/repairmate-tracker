import { useEffect, useState } from "react";
import { MessageCircle, Trash2, RefreshCw, ClipboardList, CheckCircle2, Package, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CustomerRequirement,
  RequirementStatus,
  deleteRequirement,
  listRequirements,
  updateRequirementStatus,
} from "@/lib/requirementStore";

const statusMeta: Record<RequirementStatus, { label: string; className: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: <Clock className="w-3 h-3" /> },
  confirmed: { label: "Confirmed", className: "bg-blue-100 text-blue-800 border-blue-300", icon: <CheckCircle2 className="w-3 h-3" /> },
  fulfilled: { label: "Fulfilled", className: "bg-green-100 text-green-800 border-green-300", icon: <Package className="w-3 h-3" /> },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800 border-red-300", icon: <XCircle className="w-3 h-3" /> },
};

const RequirementsSection = () => {
  const [items, setItems] = useState<CustomerRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | RequirementStatus>("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<CustomerRequirement | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listRequirements());
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.customer_name.toLowerCase().includes(s) && !r.customer_phone.includes(s)) return false;
    }
    return true;
  });

  const buildWhatsAppUrl = (r: CustomerRequirement, statusOverride?: RequirementStatus) => {
    const status = statusOverride ?? r.status;
    const itemsList = r.items.map((it, i) => `${i + 1}. ${it}`).join("\n");
    let statusLine = "";
    if (status === "confirmed") statusLine = "✅ We've *confirmed* your requirement and are arranging the items. We'll notify you once ready.";
    else if (status === "fulfilled") statusLine = "🎉 Great news! Your requested items are *now available*. Please visit our shop or reply to arrange delivery.";
    else if (status === "cancelled") statusLine = "❌ Sorry, we couldn't arrange the requested items right now.";
    else statusLine = "📋 We've received your requirement and will update you shortly.";

    const msg =
`Hello ${r.customer_name},

Thank you for sharing your requirement with *Anurag Mobile Repairing Centre*.

Your requested items:
${itemsList}

${statusLine}

For any questions, reply to this message.
– Team Anurag Mobile`;
    return `https://wa.me/91${r.customer_phone}?text=${encodeURIComponent(msg)}`;
  };

  const changeStatus = async (r: CustomerRequirement, status: RequirementStatus) => {
    try {
      await updateRequirementStatus(r.id, status);
      toast.success(`Marked as ${statusMeta[status].label}`);
      await load();
      if (detail?.id === r.id) setDetail({ ...r, status });
    } catch (e: any) { toast.error(e.message); }
  };

  const saveNotes = async () => {
    if (!detail) return;
    try {
      await updateRequirementStatus(detail.id, detail.status, adminNotes);
      toast.success("Notes saved");
      await load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this requirement?")) return;
    try { await deleteRequirement(id); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const counts = {
    all: items.length,
    pending: items.filter((r) => r.status === "pending").length,
    confirmed: items.filter((r) => r.status === "confirmed").length,
    fulfilled: items.filter((r) => r.status === "fulfilled").length,
    cancelled: items.filter((r) => r.status === "cancelled").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Customer Requirements</h2>
          <p className="text-sm text-muted-foreground">Requests for items not currently in stock.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "confirmed", "fulfilled", "cancelled"] as const).map((k) => (
          <Button key={k} variant={filter === k ? "default" : "outline"} size="sm" onClick={() => setFilter(k)} className="capitalize">
            {k} ({counts[k]})
          </Button>
        ))}
      </div>

      <Input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No requirements found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const meta = statusMeta[r.status];
            return (
              <div key={r.id} className="border rounded-xl p-4 bg-card hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => { setDetail(r); setAdminNotes(r.admin_notes ?? ""); }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.requirement_id && <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/30">{r.requirement_id}</span>}
                      <h3 className="font-semibold">{r.customer_name}</h3>
                      <Badge variant="outline" className={meta.className}>

                        <span className="flex items-center gap-1">{meta.icon} {meta.label}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">📱 {r.customer_phone} • {new Date(r.created_at).toLocaleString("en-IN")}</p>
                    <p className="text-sm mt-1"><span className="font-medium">{r.items.length}</span> item{r.items.length !== 1 && "s"}: {r.items.slice(0, 3).join(", ")}{r.items.length > 3 && "..."}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Select value={r.status} onValueChange={(v) => changeStatus(r, v as RequirementStatus)}>
                      <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="fulfilled">Fulfilled</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100" onClick={() => window.open(buildWhatsAppUrl(r), "_blank")}>
                      <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Requirement Details</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-lg">{detail.customer_name}</p>
                <p className="text-sm text-muted-foreground">📱 {detail.customer_phone}</p>
                <p className="text-xs text-muted-foreground">{new Date(detail.created_at).toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Requested Items</p>
                <ul className="space-y-1 bg-muted/40 rounded-lg p-3 text-sm">
                  {detail.items.map((it, i) => <li key={i}>{i + 1}. {it}</li>)}
                </ul>
              </div>
              {detail.notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Customer Notes</p>
                  <p className="text-sm bg-muted/40 rounded-lg p-3">{detail.notes}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-1">Admin Notes</p>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} placeholder="Internal notes..." />
                <Button size="sm" className="mt-2" onClick={saveNotes}>Save Notes</Button>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => window.open(buildWhatsAppUrl(detail), "_blank")}>
                  <MessageCircle className="w-4 h-4 mr-2" /> Send WhatsApp Update
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequirementsSection;
