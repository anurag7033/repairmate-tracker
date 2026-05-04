import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Smartphone, Clock, CheckCircle2, Loader2, Calendar, MapPin,
  Wrench, Phone, Sparkles, AlertCircle, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import Footer from "@/components/Footer";

type BookingStatus = "pending" | "confirmed" | "assigned" | "in_progress" | "completed" | "cancelled";

interface BookingRow {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_phone: string;
  device_brand: string;
  device_model: string;
  device_type: string;
  issue_type: string;
  issue_description: string;
  service_type: string;
  preferred_date: string | null;
  preferred_time_slot: string | null;
  full_address: string;
  city: string;
  pincode: string;
  status: BookingStatus;
  assigned_technician: string | null;
  tracking_id: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_FLOW: BookingStatus[] = ["pending", "confirmed", "assigned"];

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Booking Received",
  confirmed: "Booking Confirmed",
  assigned: "Technician Assigned",
  in_progress: "Repair In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_DESC: Record<BookingStatus, string> = {
  pending: "We've received your booking request. Our team will review and confirm shortly.",
  confirmed: "Your booking is confirmed. A technician will be assigned soon.",
  assigned: "A technician has been assigned. Redirecting you to the repair tracker...",
  in_progress: "Your device repair is in progress. Track on the repair page.",
  completed: "Your repair is completed.",
  cancelled: "This booking was cancelled. Please contact us for assistance.",
};

const TrackBooking = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const b = data as BookingRow;
      setBooking(b);
      setLoading(false);

      // If admin assigned a tracking_id (or marked as assigned), move to main tracker
      if (b.tracking_id && (b.status === "assigned" || b.status === "in_progress" || b.status === "completed")) {
        setTimeout(() => navigate(`/track/${b.tracking_id}`, { replace: true }), 1200);
      }
    };

    load();

    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          const b = payload.new as BookingRow;
          setBooking(b);
          if (b.tracking_id && (b.status === "assigned" || b.status === "in_progress" || b.status === "completed")) {
            navigate(`/track/${b.tracking_id}`, { replace: true });
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [bookingId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-primary-foreground/80">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading booking…</p>
        </div>
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl p-8 shadow-elevated max-w-sm w-full text-center border border-border">
          <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-3">Booking Not Found</h2>
          <p className="text-muted-foreground mb-6">
            No booking exists for ID:
            <br />
            <span className="font-mono font-bold text-foreground">{bookingId}</span>
          </p>
          <Button onClick={() => navigate("/")} className="gradient-primary rounded-xl h-12 px-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const isAssigned = booking.status === "assigned" || booking.status === "in_progress" || booking.status === "completed";
  const currentIdx = STATUS_FLOW.indexOf(booking.status === "in_progress" || booking.status === "completed" ? "assigned" : booking.status);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
      <Helmet>
        <title>Track Booking {booking.booking_id} – Anurag Mobile</title>
        <meta name="description" content="Track the status of your repair booking. We'll notify you when a technician is assigned." />
      </Helmet>

      <header className="gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-foreground/5" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary-foreground/5" />
        </div>
        <div className="container mx-auto py-4 flex items-center justify-between relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg shadow-lg" />
            <span className="font-display text-sm font-bold">Anurag Mobile</span>
          </div>
        </div>
        <div className="container mx-auto pb-10 pt-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-foreground/10 backdrop-blur-sm text-sm font-semibold mb-4 border border-primary-foreground/20">
            <Sparkles className="w-4 h-4" />
            Booking ID: <span className="font-mono">{booking.booking_id}</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">Booking Status</h1>
          <p className="text-primary-foreground/70">Hello {booking.customer_name}, here's your latest update</p>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4 max-w-xl -mt-4 relative z-20 flex-1">
        {/* Status Banner */}
        <div className={`rounded-3xl p-6 shadow-elevated border-2 mb-6 animate-fade-in ${
          isAssigned
            ? "bg-success/10 border-success/30"
            : booking.status === "cancelled"
            ? "bg-destructive/10 border-destructive/30"
            : "bg-warning/10 border-warning/30"
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isAssigned ? "bg-success/20" : booking.status === "cancelled" ? "bg-destructive/20" : "bg-warning/20"
            }`}>
              {isAssigned ? (
                <CheckCircle2 className="w-6 h-6 text-success" />
              ) : booking.status === "cancelled" ? (
                <AlertCircle className="w-6 h-6 text-destructive" />
              ) : (
                <Clock className="w-6 h-6 text-warning" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-display text-lg font-bold mb-1">{STATUS_LABEL[booking.status]}</h2>
              <p className="text-sm text-muted-foreground">{STATUS_DESC[booking.status]}</p>

              {!isAssigned && booking.status !== "cancelled" && (
                <div className="mt-4 p-3 bg-card/60 rounded-xl border border-border/50">
                  <p className="text-xs text-foreground leading-relaxed">
                    ⏳ <strong>Please wait for repair assignment.</strong> Once a technician is assigned to your device, you'll be able to track the full repair progress here.
                  </p>
                </div>
              )}

              {isAssigned && booking.tracking_id && (
                <Button
                  onClick={() => navigate(`/track/${booking.tracking_id}`)}
                  className="mt-4 gradient-primary rounded-xl"
                  size="sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Repair Tracker
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Timeline (booking lifecycle) */}
        <div className="bg-card rounded-3xl p-6 shadow-elevated border border-border mb-6 animate-fade-in">
          <h3 className="font-display text-base font-bold mb-5 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" /> Booking Progress
          </h3>
          <div className="relative pl-8">
            <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
            {STATUS_FLOW.map((s, idx) => {
              const completed = idx < currentIdx || (idx === currentIdx && isAssigned);
              const current = idx === currentIdx && !isAssigned;
              return (
                <div key={s} className="relative flex items-start gap-4 pb-6 last:pb-0">
                  <div className="absolute -left-8 top-0.5">
                    {completed ? (
                      <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center shadow-md">
                        <CheckCircle2 className="w-5 h-5 text-success-foreground" />
                      </div>
                    ) : current ? (
                      <div className="relative">
                        <div className="absolute -inset-1 rounded-full bg-primary/30 animate-ping" />
                        <div className="relative w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md">
                          <Clock className="w-4 h-4 text-primary-foreground" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${completed ? "text-success" : current ? "text-primary" : "text-muted-foreground"}`}>
                      {STATUS_LABEL[s]}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {completed ? "Done" : current ? "In progress" : "Pending"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Booking Details */}
        <div className="bg-card rounded-3xl p-6 shadow-elevated border border-border animate-fade-in space-y-4">
          <h3 className="font-display text-base font-bold flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" /> Booking Details
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Device" value={`${booking.device_brand} ${booking.device_model}`} />
            <Info label="Type" value={booking.device_type} capitalize />
            <Info label="Issue" value={booking.issue_type} />
            <Info label="Service" value={booking.service_type.replace("_", " ")} capitalize />
            {booking.preferred_date && (
              <Info label="Date" value={new Date(booking.preferred_date).toLocaleDateString("en-IN")} icon={<Calendar className="w-3 h-3" />} />
            )}
            {booking.preferred_time_slot && <Info label="Slot" value={booking.preferred_time_slot} />}
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-sm">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</p>
            <p>{booking.full_address}</p>
            <p className="text-xs text-muted-foreground mt-1">{booking.city} - {booking.pincode}</p>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Booked on {new Date(booking.created_at).toLocaleString("en-IN")}
          </p>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-xl"
            onClick={() => window.open(`tel:+917033067221`)}
          >
            <Phone className="w-4 h-4 mr-2" /> Call Us
          </Button>
          <Button
            className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white"
            onClick={() => window.open(`https://wa.me/917033067221?text=Hi%2C%20I%20want%20to%20check%20my%20booking%20${booking.booking_id}`, "_blank")}
          >
            WhatsApp Support
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const Info = ({ label, value, icon, capitalize }: { label: string; value: string; icon?: React.ReactNode; capitalize?: boolean }) => (
  <div className="bg-muted/50 rounded-xl p-3">
    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">{icon}{label}</p>
    <p className={`font-semibold text-sm ${capitalize ? "capitalize" : ""}`}>{value || "-"}</p>
  </div>
);

export default TrackBooking;
