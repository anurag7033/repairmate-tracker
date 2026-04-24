import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Eye, MessageCircle, Phone, MapPin, Calendar, Smartphone,
  User, CheckCircle2, Clock, XCircle, Wrench, Loader2, Trash2,
} from "lucide-react";

type BookingStatus = "pending" | "confirmed" | "assigned" | "in_progress" | "completed" | "cancelled";

interface Booking {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_phone: string;
  alternate_phone: string;
  customer_email: string;
  full_address: string;
  city: string;
  pincode: string;
  device_type: string;
  device_brand: string;
  device_model: string;
  imei_serial: string;
  issue_type: string;
  issue_description: string;
  image_urls: string[];
  service_type: string;
  preferred_date: string;
  preferred_time_slot: string;
  payment_method: string;
  payment_status: string;
  razorpay_payment_id: string;
  amount_paid: number;
  status: BookingStatus;
  assigned_technician: string;
  internal_notes: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  assigned: "bg-purple-100 text-purple-800 border-purple-300",
  in_progress: "bg-orange-100 text-orange-800 border-orange-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

const SERVICE_LABELS: Record<string, string> = {
  visit_shop: "Visit Shop",
  pickup_drop: "Pickup & Drop",
  doorstep: "Doorstep",
};

const AdminBookingSection = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [editTechnician, setEditTechnician] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<BookingStatus>("pending");
  const [editPaymentStatus, setEditPaymentStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setBookings((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("bookings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const cities = useMemo(() => Array.from(new Set(bookings.map((b) => b.city))).filter(Boolean), [bookings]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (cityFilter !== "all" && b.city !== cityFilter) return false;
      if (dateFilter && b.preferred_date !== dateFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          b.booking_id.toLowerCase().includes(q) ||
          b.customer_name.toLowerCase().includes(q) ||
          b.customer_phone.includes(q) ||
          b.device_brand.toLowerCase().includes(q) ||
          b.device_model.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bookings, statusFilter, cityFilter, dateFilter, search]);

  const openDetails = (b: Booking) => {
    setSelected(b);
    setEditTechnician(b.assigned_technician || "");
    setEditNotes(b.internal_notes || "");
    setEditStatus(b.status);
    setEditPaymentStatus(b.payment_status);
  };

  const saveChanges = async () => {
    if (!selected) return;
    setSaving(true);

    let trackingIdToLink: string | null = (selected as any).tracking_id || null;

    // When admin marks as "assigned" and there's no linked repair order yet, create one
    if (editStatus === "assigned" && !trackingIdToLink) {
      // Use the booking_id as the tracking_id so they stay in sync
      const newTrackingId = selected.booking_id;
      const { error: roError } = await supabase.from("repair_orders").insert({
        tracking_id: newTrackingId,
        customer_name: selected.customer_name,
        customer_phone: selected.customer_phone,
        mobile_brand: selected.device_brand,
        mobile_model: selected.device_model,
        imei_number: selected.imei_serial || "",
        issue_description: `${selected.issue_type}: ${selected.issue_description}`,
        repair_details: "",
        status: "received",
        quotation: 0,
        advance_paid: selected.amount_paid || 0,
        payment_status: selected.payment_status === "paid" ? "paid" : "pending",
      });
      if (roError) {
        setSaving(false);
        toast({ title: "Failed to create repair order", description: roError.message, variant: "destructive" });
        return;
      }
      trackingIdToLink = newTrackingId;
      toast({ title: "Repair order created", description: `Tracking ID: ${newTrackingId}` });
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        status: editStatus,
        assigned_technician: editTechnician,
        internal_notes: editNotes,
        payment_status: editPaymentStatus as any,
        tracking_id: trackingIdToLink,
      } as any)
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Booking updated" });
    setSelected(null);
    load();
  };

  const deleteBooking = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Booking deleted" });
    setSelected(null);
    load();
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: bookings.length };
    bookings.forEach((b) => { c[b.status] = (c[b.status] || 0) + 1; });
    return c;
  }, [bookings]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {(["all", "pending", "confirmed", "assigned", "in_progress", "completed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`p-3 rounded-xl border-2 text-left transition-colors ${statusFilter === s ? "border-orange-500 bg-orange-50" : "border-border bg-card hover:border-muted-foreground"}`}
          >
            <p className="text-xs text-muted-foreground capitalize">{s === "all" ? "Total" : STATUS_LABELS[s as BookingStatus]}</p>
            <p className="text-xl font-bold">{counts[s] || 0}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by ID, name, phone, device..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="md:w-48"><SelectValue placeholder="City" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="md:w-44" />
        {(dateFilter || cityFilter !== "all" || statusFilter !== "all" || search) && (
          <Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); setCityFilter("all"); setDateFilter(""); }}>Clear</Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-semibold">Booking ID</th>
                <th className="p-3 font-semibold">Customer</th>
                <th className="p-3 font-semibold">Device</th>
                <th className="p-3 font-semibold">Issue</th>
                <th className="p-3 font-semibold">Date</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No bookings found</td></tr>
              ) : filtered.map((b) => (
                <tr key={b.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs font-semibold text-orange-600">{b.booking_id}</td>
                  <td className="p-3">
                    <div className="font-medium">{b.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{b.customer_phone} · {b.city}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{b.device_brand} {b.device_model}</div>
                    <div className="text-xs text-muted-foreground capitalize">{b.device_type}</div>
                  </td>
                  <td className="p-3 text-xs">{b.issue_type}</td>
                  <td className="p-3 text-xs">
                    {b.preferred_date ? new Date(b.preferred_date).toLocaleDateString("en-IN") : "-"}
                    <div className="text-muted-foreground">{b.preferred_time_slot}</div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[b.status]}`}>
                      {STATUS_LABELS[b.status]}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openDetails(b)}><Eye className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => window.open(`https://wa.me/91${b.customer_phone}?text=Hi%20${encodeURIComponent(b.customer_name)}%2C%20regarding%20your%20booking%20${b.booking_id}`, "_blank")}>
                        <MessageCircle className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => window.open(`tel:+91${b.customer_phone}`)}>
                        <Phone className="w-4 h-4 text-blue-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  Booking <span className="font-mono text-orange-600">{selected.booking_id}</span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Customer */}
                <Card title="Customer" icon={<User className="w-4 h-4" />}>
                  <Row label="Name" value={selected.customer_name} />
                  <Row label="Phone" value={selected.customer_phone} />
                  {selected.alternate_phone && <Row label="Alt Phone" value={selected.alternate_phone} />}
                  {selected.customer_email && <Row label="Email" value={selected.customer_email} />}
                </Card>

                {/* Address */}
                <Card title="Address" icon={<MapPin className="w-4 h-4" />}>
                  <p className="text-sm">{selected.full_address}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selected.city} - {selected.pincode}</p>
                  {selected.latitude != null && selected.longitude != null && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      📍 {Number(selected.latitude).toFixed(6)}, {Number(selected.longitude).toFixed(6)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selected.latitude != null && selected.longitude != null ? (
                      <>
                        <Button size="sm" variant="default" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selected.latitude},${selected.longitude}`, "_blank")}>
                          <MapPin className="w-3 h-3 mr-1" /> Exact Pin
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`, "_blank")}>
                          Directions
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.full_address + ", " + selected.city + " " + selected.pincode)}`, "_blank")}>
                        <MapPin className="w-3 h-3 mr-1" /> View on Map
                      </Button>
                    )}
                  </div>
                </Card>

                {/* Device */}
                <Card title="Device" icon={<Smartphone className="w-4 h-4" />}>
                  <Row label="Type" value={selected.device_type} />
                  <Row label="Brand / Model" value={`${selected.device_brand} ${selected.device_model}`} />
                  {selected.imei_serial && <Row label="IMEI / Serial" value={selected.imei_serial} />}
                  {(selected as any).tracking_id && <Row label="Tracking ID" value={(selected as any).tracking_id} />}
                </Card>

                {/* Issue */}
                <Card title="Issue" icon={<Wrench className="w-4 h-4" />}>
                  <Row label="Type" value={selected.issue_type} />
                  <p className="text-sm mt-2 whitespace-pre-wrap">{selected.issue_description}</p>
                  {selected.image_urls?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selected.image_urls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="Issue" className="w-20 h-20 object-cover rounded-lg border border-border" />
                        </a>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Service */}
                <Card title="Service" icon={<Calendar className="w-4 h-4" />}>
                  <Row label="Type" value={SERVICE_LABELS[selected.service_type] || selected.service_type} />
                  <Row label="Date" value={selected.preferred_date ? new Date(selected.preferred_date).toLocaleDateString("en-IN") : "-"} />
                  <Row label="Slot" value={selected.preferred_time_slot} />
                </Card>

                {/* Payment */}
                <Card title="Payment" icon={<CheckCircle2 className="w-4 h-4" />}>
                  <Row label="Method" value={selected.payment_method.toUpperCase()} />
                  <Row label="Status" value={selected.payment_status} />
                  {selected.razorpay_payment_id && <Row label="Razorpay ID" value={selected.razorpay_payment_id} />}
                  {selected.amount_paid > 0 && <Row label="Amount Paid" value={`₹${selected.amount_paid}`} />}
                </Card>

                {/* Admin controls */}
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Admin Controls</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={editStatus} onValueChange={(v) => setEditStatus(v as BookingStatus)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABELS) as BookingStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Payment Status</Label>
                      <Select value={editPaymentStatus} onValueChange={setEditPaymentStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Assigned Technician</Label>
                    <Input value={editTechnician} onChange={(e) => setEditTechnician(e.target.value)} placeholder="Technician name" />
                  </div>
                  <div>
                    <Label className="text-xs">Internal Notes</Label>
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes for the team..." rows={3} />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="destructive" size="sm" onClick={() => deleteBooking(selected.id)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                    <Button onClick={saveChanges} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                      {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                      Save Changes
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Booked on {new Date(selected.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Card = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-muted/30 rounded-xl p-4 border border-border">
    <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">{icon}{title}</div>
    {children}
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex gap-2 text-sm">
    <span className="text-muted-foreground min-w-[100px]">{label}:</span>
    <span className="font-medium capitalize">{value || "-"}</span>
  </div>
);

export default AdminBookingSection;
