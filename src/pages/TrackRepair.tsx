import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { findByTrackingId } from "@/lib/repairStore";
import { RepairOrder, STATUS_LABELS, STATUS_ORDER } from "@/types/repair";
import { ArrowLeft, Smartphone, CheckCircle2, Circle, Clock, CreditCard, ExternalLink } from "lucide-react";
import Footer from "@/components/Footer";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";

const TrackRepair = () => {
  const { trackingId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (trackingId) {
        const found = await findByTrackingId(trackingId);
        if (found) {
          setOrder(found);
        } else {
          setNotFound(true);
        }
      }
      setLoading(false);
    };
    load();
  }, [trackingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl p-8 shadow-elevated max-w-sm w-full text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="font-display text-xl font-bold mb-2">Not Found</h2>
          <p className="text-muted-foreground text-sm mb-6">
            No repair order found for tracking ID: <strong>{trackingId}</strong>
          </p>
          <Button onClick={() => navigate("/")} className="gradient-primary hover:opacity-90 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const currentIndex = STATUS_ORDER.indexOf(order.status);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-hero text-primary-foreground">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-display text-sm font-bold">Anurag Mobile</span>
          </div>
        </div>
        <div className="container mx-auto pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-sm font-medium mb-4">
            <Clock className="w-4 h-4" />
            Tracking ID: {order.trackingId}
          </div>
          <h1 className="font-display text-3xl font-bold">Repair Status</h1>
        </div>
      </header>

      <div className="container mx-auto py-8 max-w-lg">
        {/* Device Info */}
        <div className="bg-card rounded-2xl p-6 shadow-card border border-border mb-6 animate-fade-in">
          <h2 className="font-display text-lg font-semibold mb-4">Device Details</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Brand</span>
              <p className="font-medium">{order.mobileBrand}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Model</span>
              <p className="font-medium">{order.mobileModel}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Issue</span>
              <p className="font-medium">{order.issueDescription}</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-card rounded-2xl p-6 shadow-card border border-border mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="font-display text-lg font-semibold mb-6">Repair Progress</h2>
          <div className="space-y-0">
            {STATUS_ORDER.map((status, i) => {
              const isCompleted = i <= currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <div key={status} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    {isCompleted ? (
                      <CheckCircle2 className={`w-6 h-6 ${isCurrent ? "text-primary" : "text-success"}`} />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground/30" />
                    )}
                    {i < STATUS_ORDER.length - 1 && (
                      <div className={`w-0.5 h-8 ${i < currentIndex ? "bg-success" : "bg-muted"}`} />
                    )}
                  </div>
                  <div className={`pb-8 ${isCurrent ? "text-foreground" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                    <p className={`font-medium text-sm ${isCurrent ? "font-semibold" : ""}`}>
                      {STATUS_LABELS[status]}
                    </p>
                    {isCurrent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mt-1">
                        Current
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment */}
        <div className="bg-card rounded-2xl p-6 shadow-card border border-border animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="font-display text-lg font-semibold mb-4">Payment Details</h2>
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground text-sm">Quotation</span>
            <span className="font-display text-2xl font-bold text-primary">₹{order.quotation}</span>
          </div>
          <div className="flex items-center justify-between mb-6">
            <span className="text-muted-foreground text-sm">Status</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              order.paymentStatus === "paid"
                ? "bg-success/10 text-success"
                : order.paymentStatus === "partial"
                ? "bg-warning/10 text-warning"
                : "bg-primary/10 text-primary"
            }`}>
              {order.paymentStatus === "paid" ? "Paid" : order.paymentStatus === "partial" ? "Partially Paid" : "Pending"}
            </span>
          </div>

          {order.paymentStatus !== "paid" && order.paymentLink && order.status === "completed" && (
            <Button
              className="w-full h-12 gradient-primary hover:opacity-90 rounded-xl font-semibold"
              onClick={() => window.open(order.paymentLink, "_blank")}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Now
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          )}

          {order.paymentStatus !== "paid" && order.status !== "completed" && (
            <p className="text-center text-muted-foreground text-xs">
              Payment link will be available once repair is completed.
            </p>
          )}
        </div>

        {order.repairDetails && (
          <div className="bg-card rounded-2xl p-6 shadow-card border border-border mt-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <h2 className="font-display text-lg font-semibold mb-3">Repair Details</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{order.repairDetails}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackRepair;
