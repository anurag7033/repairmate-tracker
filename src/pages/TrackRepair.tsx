import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { findByTrackingId, applyVoucher } from "@/lib/repairStore";
import { RepairOrder, STATUS_LABELS, STATUS_ORDER } from "@/types/repair";
import { ArrowLeft, Smartphone, CheckCircle2, Circle, Clock, CreditCard, ExternalLink, Sparkles, Shield, Wrench, Ticket, CalendarDays, Loader2 } from "lucide-react";
import Footer from "@/components/Footer";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TrackRepair = () => {
  const { trackingId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [progressHeight, setProgressHeight] = useState(0);
  const { toast } = useToast();

  // Refs for dynamic height calculation
  const timelineRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>(Array(7).fill(null));

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

  // Dynamic progress height calculation
  const calculateProgressHeight = () => {
    if (!timelineRef.current || !order) return;

    const currentIndex = STATUS_ORDER.indexOf(order.status);
    if (currentIndex === -1) return; // Invalid status

    const activeStep = stepRefs.current[currentIndex];
    if (!activeStep) return;

    // Get the position relative to the timeline container
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const activeStepRect = activeStep.getBoundingClientRect();

    // Calculate height from top of timeline to center of active step
    const height = activeStepRect.top - timelineRect.top + (activeStepRect.height / 2);
    setProgressHeight(Math.max(0, height));
  };

  useEffect(() => {
    // Calculate initial height
    const timer = setTimeout(calculateProgressHeight, 100); // Small delay to ensure DOM is rendered

    // Recalculate on window resize
    const handleResize = () => calculateProgressHeight();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse">
              <Smartphone className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="absolute -inset-2 rounded-3xl bg-primary/10 animate-ping" />
          </div>
          <p className="text-primary-foreground/70 font-medium">Loading your repair status...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl p-8 shadow-elevated max-w-sm w-full text-center animate-fade-in border border-border">
          <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <Smartphone className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-3">Not Found</h2>
          <p className="text-muted-foreground mb-6">
            No repair order found for tracking ID:
            <br />
            <span className="font-mono font-bold text-foreground">{trackingId}</span>
          </p>
          <Button onClick={() => navigate("/")} className="gradient-primary hover:opacity-90 rounded-xl h-12 px-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const currentIndex = STATUS_ORDER.indexOf(order.status);
  const balanceDue = order.quotation - order.advancePaid - order.discountAmount;

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    try {
      await applyVoucher(voucherCode.trim(), order.trackingId, order.customerPhone);
      toast({ title: "Voucher Applied!", description: `Discount applied successfully.` });
      setVoucherCode("");
      // Reload order
      const updated = await findByTrackingId(trackingId!);
      if (updated) setOrder(updated);
    } catch (err: any) {
      toast({ title: "Invalid Voucher", description: err.message, variant: "destructive" });
    } finally {
      setVoucherLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Hero Header */}
      <header className="gradient-hero text-primary-foreground relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-foreground/5" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary-foreground/5" />
        </div>
        
        <div className="container mx-auto py-4 flex items-center justify-between relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg shadow-lg" />
            <span className="font-display text-sm font-bold">Anurag Mobile</span>
          </div>
        </div>
        <div className="container mx-auto pb-10 pt-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-foreground/10 backdrop-blur-sm text-sm font-semibold mb-4 border border-primary-foreground/20">
            <Sparkles className="w-4 h-4" />
            Tracking ID: <span className="font-mono">{order?.trackingId || trackingId}</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">Repair Status</h1>
          <p className="text-primary-foreground/70">Real-time updates on your device repair</p>
        </div>
      </header>

      <div className="container mx-auto py-8 px-4 max-w-xl -mt-4 relative z-20">
        {/* Device Info Card */}
        <div className="bg-card rounded-3xl p-6 shadow-elevated border border-border mb-6 animate-fade-in backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Device Details</h2>
              <p className="text-xs text-muted-foreground">Your device information</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-xl p-3">
              <span className="text-xs text-muted-foreground block mb-1">Brand</span>
              <p className="font-semibold text-sm">{order?.mobileBrand || "Loading..."}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <span className="text-xs text-muted-foreground block mb-1">Model</span>
              <p className="font-semibold text-sm">{order?.mobileModel || "Loading..."}</p>
            </div>
            <div className="col-span-2 bg-muted/50 rounded-xl p-3">
              <span className="text-xs text-muted-foreground block mb-1">Issue</span>
              <p className="font-semibold text-sm">{order?.issueDescription || "Loading..."}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <span className="text-xs text-muted-foreground block mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Received On</span>
              <p className="font-semibold text-sm">{order ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Loading..."}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <span className="text-xs text-muted-foreground block mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Last Updated</span>
              <p className="font-semibold text-sm">{order ? new Date(order.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date(order.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Loading..."}</p>
            </div>
          </div>
        </div>

        {/* Repair Steps Timeline */}
        <div className="w-full bg-blue-50 rounded-3xl p-8 mb-6 shadow-elevated border border-border animate-fade-in backdrop-blur-sm" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-success" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Repair Progress</h2>
              <p className="text-xs text-muted-foreground">Track every step of the repair</p>
            </div>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="relative" ref={timelineRef}>
              {/* Timeline line container - positioned to the right */}
              <div className="absolute right-0 top-0 bottom-0 w-10 flex justify-center">
                <div className="relative w-1 h-full">
                  {/* Grey background line - full height */}
                  <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-1 bg-gray-300 rounded-full"></div>
                  
                  {/* Orange progress line - from top to center of active step */}
                  <div 
                    className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-orange-400 rounded-full transition-all duration-500 ease-in-out z-10"
                    style={{
                      height: `${progressHeight}px`,
                      width: '4px'
                    }}
                  ></div>
                </div>
              </div>
              
              {[
                { title: "Device Received", desc: "Your device has been received and logged into our system.", icon: "📱", status: "received" },
                { title: "Diagnosing Issue", desc: "Our technician inspects your device and creates repair plan.", icon: "🔍", status: "diagnosing" },
                { title: "Waiting for Parts", desc: "We secure genuine parts or high-quality alternatives when needed.", icon: "⏳", status: "waiting_for_parts" },
                { title: "Repairing", desc: "Certified technicians perform the repair with precision and safety.", icon: "🔧", status: "repairing" },
                { title: "Testing", desc: "Device testing after repair completion.", icon: "✔", status: "testing" },
                { title: "Repair Completed", desc: "Your device is ready and verified by final quality review.", icon: "✅", status: "completed" },
                { title: "Delivered", desc: "You receive your device back in perfect working condition.", icon: "🚚", status: "delivered" },
              ].map((step, idx) => {
                const isCompleted = idx < currentIndex;
                const isCurrent = idx === currentIndex;
                const isPending = idx > currentIndex;

                const isStepCompleted = isCompleted || (isCurrent && (order.status === "completed" || order.status === "delivered"));
                const isStepCurrent = isCurrent && !(order.status === "completed" || order.status === "delivered");
                const isStepPending = !isStepCompleted && !isStepCurrent;

                return (
                  <div key={idx} className="mb-8 flex items-start gap-6">
                    {/* Step Content Card - Left side */}
                    <div className={`flex-1 rounded-xl p-4 shadow-md border transition-all duration-500 ${
                      isStepCompleted ? "bg-white border-green-200 hover:shadow-xl" : 
                      isStepCurrent ? "bg-orange-50 border-orange-200 shadow-orange-100" : 
                      "bg-gray-50 border-gray-200"
                    }`}>
                      <p className={`text-sm font-semibold transition-all duration-300 ${
                        isStepCompleted ? "text-green-500" : 
                        isStepCurrent ? "text-orange-500" : 
                        "text-gray-400"
                      }`}>
                        {isStepCompleted ? "COMPLETED" : isStepCurrent ? "IN PROGRESS" : "PENDING"}
                      </p>
                      <h3 className={`text-base font-bold mt-1 transition-all duration-300 ${
                        isStepPending ? "text-gray-600" : "text-black"
                      }`}>
                        {step.title}
                      </h3>
                      <p className={`text-sm mt-1 transition-all duration-300 ${
                        isStepPending ? "text-gray-400" : "text-gray-600"
                      }`}>
                        {step.desc}
                      </p>
                    </div>
                    
                    {/* Timeline Icon Container - Right side */}
                    <div 
                      className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center"
                      ref={(el) => stepRefs.current[idx] = el}
                    >
                      {isStepCurrent ? (
                        <div className="relative z-20">
                          {/* Pulse animation background */}
                          <div className="absolute inset-0 w-10 h-10 bg-orange-400 rounded-full opacity-30 animate-ping"></div>
                          {/* Main icon */}
                          <div className="relative w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg font-bold text-lg transition-all duration-300">
                            {step.icon}
                          </div>
                        </div>
                      ) : (
                        <div className={`relative z-20 w-10 h-10 rounded-full text-white shadow-lg font-bold text-lg flex items-center justify-center transition-all duration-300 ${
                          isStepCompleted ? "bg-green-500" : "bg-gray-300"
                        }`}>
                          {step.icon}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Payment Card */}
        <div className="bg-card rounded-3xl p-6 shadow-elevated border border-border animate-fade-in backdrop-blur-sm" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Payment Details</h2>
              <p className="text-xs text-muted-foreground">Your payment summary</p>
            </div>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <span className="text-sm text-muted-foreground">Total Amount</span>
              <span className="font-display text-xl font-bold">₹{order.quotation}</span>
            </div>
            
            {order.advancePaid > 0 && (
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-xl">
                <span className="text-sm text-success">Advance Paid</span>
                <span className="font-display text-lg font-bold text-success">- ₹{order.advancePaid}</span>
              </div>
            )}

            {order.discountAmount > 0 && (
              <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-xl">
                <span className="text-sm text-amber-600 flex items-center gap-1">
                  <Ticket className="w-4 h-4" /> Voucher Discount
                </span>
                <span className="font-display text-lg font-bold text-amber-600">- ₹{order.discountAmount}</span>
              </div>
            )}
            
            {balanceDue > 0 && (
              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border-2 border-primary/20">
                <span className="text-sm font-medium text-primary">Balance Due</span>
                <span className="font-display text-2xl font-bold text-primary">₹{balanceDue}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center mb-5">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${
              order.paymentStatus === "paid"
                ? "bg-success/10 text-success border border-success/20"
                : order.paymentStatus === "partial"
                ? "bg-warning/10 text-warning border border-warning/20"
                : "bg-muted text-muted-foreground border border-border"
            }`}>
              <Shield className="w-4 h-4" />
              {order.paymentStatus === "paid" 
                ? "✓ Payment Complete" 
                : order.paymentStatus === "partial" 
                ? "Partially Paid" 
                : "Payment Pending"}
            </span>
          </div>

          {/* Voucher Apply Section */}
          {order.paymentStatus !== "paid" && balanceDue > 0 && (
            <div className="p-4 bg-muted/50 rounded-xl space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                Have a voucher code?
              </p>
              <div className="flex gap-2">
                <Input
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="Enter voucher code"
                  className="rounded-lg font-mono"
                />
                <Button
                  onClick={handleApplyVoucher}
                  disabled={voucherLoading || !voucherCode.trim()}
                  className="rounded-lg px-6"
                >
                  {voucherLoading ? "..." : "Apply"}
                </Button>
              </div>
            </div>
          )}

          {order.paymentStatus !== "paid" && order.status === "completed" && balanceDue > 0 && (
            <Button
              className="w-full h-14 gradient-primary hover:opacity-90 rounded-xl font-semibold text-lg shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] mt-4"
              disabled={payLoading}
              onClick={async () => {
                setPayLoading(true);
                try {
                  const { data, error } = await supabase.functions.invoke("create-payment-link", {
                    body: { trackingId: order.trackingId },
                  });
                  if (error) throw error;
                  if (data?.short_url) {
                    window.location.href = data.short_url;
                  } else {
                    throw new Error("No payment link received");
                  }
                } catch (err: any) {
                  toast({ title: "Payment Error", description: err.message || "Failed to create payment link", variant: "destructive" });
                  setPayLoading(false);
                }
              }}
            >
              {payLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Payment Link...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay ₹{balanceDue} Now
                  <ExternalLink className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          )}

          {order.paymentStatus !== "paid" && order.status !== "completed" && (
            <div className="text-center p-4 bg-muted/50 rounded-xl mt-4">
              <p className="text-muted-foreground text-sm">
                💡 Payment link will be available once repair is completed
              </p>
            </div>
          )}
        </div>

        {/* Repair Details Card */}
        {order.repairDetails && (
          <div className="bg-card rounded-3xl p-6 shadow-elevated border border-border mt-6 animate-fade-in backdrop-blur-sm" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-secondary" />
              </div>
              <h2 className="font-display text-lg font-bold">Technician Notes</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 rounded-xl p-4">
              {order.repairDetails}
            </p>
          </div>
        )}

        {/* Trust Badge */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
            <Shield className="w-4 h-4" />
            Secure tracking powered by Anurag Mobile
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TrackRepair;
