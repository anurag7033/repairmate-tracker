import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { z } from "zod";
import {
  ArrowLeft, Upload, X, CheckCircle2, Calendar, Smartphone, Wrench,
  Phone, Mail, MapPin, CreditCard, Loader2, Copy, Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import Footer from "@/components/Footer";
import LocationPicker, { type PickedLocation } from "@/components/LocationPicker";

const ISSUE_TYPES = [
  "Screen / Display",
  "Battery",
  "Charging Port",
  "Water Damage",
  "Software / OS",
  "Speaker / Mic",
  "Camera",
  "Other",
];

const TIME_SLOTS = [
  "09:00 AM - 11:00 AM",
  "11:00 AM - 01:00 PM",
  "01:00 PM - 03:00 PM",
  "03:00 PM - 05:00 PM",
  "05:00 PM - 07:00 PM",
  "07:00 PM - 09:00 PM",
];

const bookingSchema = z.object({
  customer_name: z.string().trim().min(2, "Name is required").max(100),
  customer_phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  alternate_phone: z.string().trim().regex(/^$|^[6-9]\d{9}$/, "Enter a valid 10-digit number").optional(),
  customer_email: z.string().trim().email("Invalid email").or(z.literal("")).optional(),
  full_address: z.string().trim().min(5, "Address is required").max(500),
  city: z.string().trim().min(2, "City is required").max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  device_type: z.enum(["mobile", "laptop", "tablet", "other"]),
  device_brand: z.string().trim().min(1, "Brand is required").max(50),
  device_model: z.string().trim().min(1, "Model is required").max(80),
  imei_serial: z.string().trim().max(50).optional(),
  issue_type: z.string().min(1, "Select an issue type"),
  issue_description: z.string().trim().min(10, "Describe the issue (min 10 chars)").max(1000),
  service_type: z.enum(["pickup_drop", "doorstep", "visit_shop"]),
  preferred_date: z.string().min(1, "Select a date"),
  preferred_time_slot: z.string().min(1, "Select a time slot"),
  payment_method: z.enum(["online", "cash"]),
  terms_accepted: z.literal(true, { errorMap: () => ({ message: "You must accept terms" }) }),
});

const generateBookingId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "BK-";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};

const todayStr = () => new Date().toISOString().split("T")[0];

const BookRepair = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [success, setSuccess] = useState<{ bookingId: string; name: string } | null>(null);

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    alternate_phone: "",
    customer_email: "",
    full_address: "",
    city: "",
    pincode: "",
    device_type: "mobile" as "mobile" | "laptop" | "tablet" | "other",
    device_brand: "",
    device_model: "",
    imei_serial: "",
    issue_type: "",
    issue_description: "",
    service_type: "visit_shop" as "pickup_drop" | "doorstep" | "visit_shop",
    preferred_date: "",
    preferred_time_slot: "",
    payment_method: "cash" as "online" | "cash",
    terms_accepted: false,
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (imageUrls.length + files.length > 5) {
      toast({ title: "Limit reached", description: "Max 5 images", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast({ title: "File too large", description: `${file.name} exceeds 5MB`, variant: "destructive" });
          continue;
        }
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("booking-images").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("booking-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      setImageUrls((p) => [...p, ...uploaded]);
      toast({ title: "Uploaded", description: `${uploaded.length} image(s) added` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (url: string) => setImageUrls((p) => p.filter((u) => u !== url));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = bookingSchema.safeParse(form);
    if (!result.success) {
      const first = result.error.errors[0];
      toast({ title: "Validation error", description: first.message, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const bookingId = generateBookingId();
      const { error } = await supabase.from("bookings").insert({
        booking_id: bookingId,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        alternate_phone: form.alternate_phone.trim(),
        customer_email: form.customer_email.trim(),
        full_address: form.full_address.trim(),
        city: form.city.trim(),
        pincode: form.pincode.trim(),
        device_type: form.device_type,
        device_brand: form.device_brand.trim(),
        device_model: form.device_model.trim(),
        imei_serial: form.imei_serial.trim(),
        issue_type: form.issue_type,
        issue_description: form.issue_description.trim(),
        image_urls: imageUrls,
        service_type: form.service_type,
        preferred_date: form.preferred_date,
        preferred_time_slot: form.preferred_time_slot,
        payment_method: form.payment_method,
        terms_accepted: form.terms_accepted,
      });
      if (error) throw error;

      // Fire-and-forget admin email notification
      supabase.functions.invoke("notify-booking-email", {
        body: {
          booking_id: bookingId,
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          alternate_phone: form.alternate_phone,
          customer_email: form.customer_email,
          full_address: form.full_address,
          city: form.city,
          pincode: form.pincode,
          device_type: form.device_type,
          device_brand: form.device_brand,
          device_model: form.device_model,
          imei_serial: form.imei_serial,
          issue_type: form.issue_type,
          issue_description: form.issue_description,
          service_type: form.service_type,
          preferred_date: form.preferred_date,
          preferred_time_slot: form.preferred_time_slot,
          payment_method: form.payment_method,
        },
      }).catch((e) => console.error("Email notify failed:", e));

      setSuccess({ bookingId, name: form.customer_name });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Helmet><title>Booking Confirmed – Anurag Mobile Repairing Centre</title></Helmet>
        <div className="container mx-auto py-12 flex-1 flex items-center justify-center">
          <div className="max-w-lg w-full bg-card rounded-3xl p-8 shadow-elevated border border-border text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Booking Confirmed!</h1>
            <p className="text-muted-foreground mb-6">Thank you, {success.name}. Our team will contact you shortly.</p>
            <div className="bg-orange-50 border-2 border-dashed border-orange-300 rounded-2xl p-4 mb-6">
              <p className="text-xs text-orange-700 font-semibold mb-1">YOUR BOOKING ID</p>
              <div className="flex items-center justify-center gap-2">
                <p className="font-display text-2xl font-bold text-orange-600">{success.bookingId}</p>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(success.bookingId);
                    toast({ title: "Copied!" });
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Save this ID for reference</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => navigate("/")} className="flex-1 h-11 rounded-xl" variant="outline">
                <Home className="w-4 h-4 mr-2" /> Home
              </Button>
              <Button
                onClick={() => window.open(`https://wa.me/917033067221?text=Hi%2C%20my%20booking%20ID%20is%20${success.bookingId}`, "_blank")}
                className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700"
              >
                <Phone className="w-4 h-4 mr-2" /> Contact Us
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Book Repair Assistance – Anurag Mobile Repairing Centre</title>
        <meta name="description" content="Book a mobile, laptop, or tablet repair online. Pickup & drop, doorstep, or in-store service available." />
      </Helmet>

      <header className="gradient-hero text-primary-foreground">
        <nav className="container mx-auto flex items-center justify-between py-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-lg" />
            <div className="text-left">
              <span className="font-display text-lg font-bold leading-tight block">Anurag Mobile</span>
              <p className="text-xs text-primary-foreground/60 leading-tight">Book Your Repair</p>
            </div>
          </button>
          <Button variant="outline" onClick={() => navigate("/")} className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </nav>
        <div className="container mx-auto py-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 text-primary-foreground text-sm font-medium mb-4">
            <Wrench className="w-4 h-4" /> Book Your Repair Assistance
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Get Your Device Fixed</h1>
          <p className="text-primary-foreground/70 max-w-xl mx-auto">Fill the form below — our expert technicians will reach out to confirm your booking.</p>
        </div>
      </header>

      <main className="container mx-auto py-10 flex-1">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
          {/* Customer */}
          <Section icon={<Phone className="w-5 h-5" />} title="Contact Details">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Full Name *">
                <Input value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} placeholder="John Doe" />
              </Field>
              <Field label="Mobile Number *">
                <Input value={form.customer_phone} onChange={(e) => update("customer_phone", e.target.value)} placeholder="9876543210" maxLength={10} />
              </Field>
              <Field label="Alternate Number">
                <Input value={form.alternate_phone} onChange={(e) => update("alternate_phone", e.target.value)} placeholder="Optional" maxLength={10} />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} placeholder="you@example.com" />
              </Field>
            </div>
          </Section>

          {/* Address */}
          <Section icon={<MapPin className="w-5 h-5" />} title="Address">
            <div className="mb-4">
              <Label className="text-sm font-medium mb-1.5 block">Pick on Map (recommended)</Label>
              <LocationPicker
                onLocationSelect={(loc: PickedLocation) => {
                  setForm((p) => ({
                    ...p,
                    full_address: loc.address || p.full_address,
                    city: loc.city || p.city,
                    pincode: loc.pincode || p.pincode,
                  }));
                }}
              />
            </div>
            <Field label="Full Address *">
              <Textarea value={form.full_address} onChange={(e) => update("full_address", e.target.value)} placeholder="House no, street, area, landmark" rows={2} />
            </Field>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <Field label="City *">
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="City" />
              </Field>
              <Field label="Pincode *">
                <Input value={form.pincode} onChange={(e) => update("pincode", e.target.value)} placeholder="6-digit" maxLength={6} />
              </Field>
            </div>
          </Section>

          {/* Device */}
          <Section icon={<Smartphone className="w-5 h-5" />} title="Device Details">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Device Type *">
                <Select value={form.device_type} onValueChange={(v) => update("device_type", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="laptop">Laptop</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Brand *">
                <Input value={form.device_brand} onChange={(e) => update("device_brand", e.target.value)} placeholder="e.g. Samsung" />
              </Field>
              <Field label="Model *">
                <Input value={form.device_model} onChange={(e) => update("device_model", e.target.value)} placeholder="e.g. Galaxy S21" />
              </Field>
              <Field label="IMEI / Serial">
                <Input value={form.imei_serial} onChange={(e) => update("imei_serial", e.target.value)} placeholder="Optional" />
              </Field>
            </div>
          </Section>

          {/* Issue */}
          <Section icon={<Wrench className="w-5 h-5" />} title="Issue Details">
            <Field label="Issue Type *">
              <Select value={form.issue_type} onValueChange={(v) => update("issue_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select issue" /></SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Describe the problem *" className="mt-4">
              <Textarea value={form.issue_description} onChange={(e) => update("issue_description", e.target.value)} placeholder="Tell us what's wrong with your device..." rows={4} />
            </Field>

            <div className="mt-4">
              <Label className="text-sm font-medium mb-2 block">Upload Photos (optional, max 5)</Label>
              <div className="flex flex-wrap gap-3">
                {imageUrls.map((url) => (
                  <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={url} alt="Issue" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(url)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {imageUrls.length < 5 && (
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors">
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                    <span className="text-[10px] text-muted-foreground mt-1">Add</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                )}
              </div>
            </div>
          </Section>

          {/* Service */}
          <Section icon={<Calendar className="w-5 h-5" />} title="Service Preference">
            <Field label="Service Type *">
              <Select value={form.service_type} onValueChange={(v) => update("service_type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visit_shop">Visit Shop</SelectItem>
                  <SelectItem value="pickup_drop">Pickup & Drop</SelectItem>
                  <SelectItem value="doorstep">Doorstep Repair</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <Field label="Preferred Date *">
                <Input type="date" min={todayStr()} value={form.preferred_date} onChange={(e) => update("preferred_date", e.target.value)} />
              </Field>
              <Field label="Preferred Time Slot *">
                <Select value={form.preferred_time_slot} onValueChange={(v) => update("preferred_time_slot", v)}>
                  <SelectTrigger><SelectValue placeholder="Select slot" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          {/* Payment */}
          <Section icon={<CreditCard className="w-5 h-5" />} title="Payment Method">
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: "cash", label: "Cash on Service", desc: "Pay after repair" },
                { v: "online", label: "Online (Razorpay)", desc: "UPI / Card / Wallet" },
              ].map((p) => (
                <button
                  type="button"
                  key={p.v}
                  onClick={() => update("payment_method", p.v as any)}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${form.payment_method === p.v ? "border-orange-500 bg-orange-50" : "border-border hover:border-muted-foreground"}`}
                >
                  <p className="font-semibold text-sm">{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                </button>
              ))}
            </div>
            {form.payment_method === "online" && (
              <p className="text-xs text-muted-foreground mt-3">Payment link will be shared after booking confirmation.</p>
            )}
          </Section>

          {/* Terms */}
          <div className="bg-card rounded-2xl p-5 border border-border">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={form.terms_accepted} onCheckedChange={(v) => update("terms_accepted", v === true)} className="mt-0.5" />
              <span className="text-sm text-foreground">
                I agree to the <span className="text-orange-600 font-semibold">Terms & Conditions</span> and confirm the details provided are accurate.
              </span>
            </label>
          </div>

          <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl gradient-primary font-semibold text-base">
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Confirm Booking"}
          </Button>
        </form>
      </main>

      <Footer />
    </div>
  );
};

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="bg-card rounded-2xl p-6 border border-border shadow-card">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center">{icon}</div>
      <h2 className="font-display text-lg font-bold">{title}</h2>
    </div>
    {children}
  </div>
);

const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={className}>
    <Label className="text-sm font-medium mb-1.5 block">{label}</Label>
    {children}
  </div>
);

export default BookRepair;
