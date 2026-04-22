import { useEffect, useState } from "react";
import { Search, Shield, ArrowRight, Wrench, Clock, CreditCard, CheckCircle2, Truck, Tag, Smartphone, Wallet, Phone, MessageCircle, MapPin, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Footer from "@/components/Footer";
import logo from "@/assets/logo.png";

const Index = () => {
  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleTrack = async () => {
    if (!trackingId.trim()) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate(`/track/${trackingId.trim()}`);
    }, 900);
  };




  if (loading) {
    return (
      <div className="min-h-screen bg-blue-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="loader" />
          <p className="text-white text-lg sm:text-xl font-semibold">Loading Your Repair</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Anurag Mobile Repairing Centre – Track Your Mobile Repair Status Online</title>
        <meta name="description" content="Anurag Mobile Repairing Centre provides expert mobile phone repair services with real-time repair tracking, genuine spare parts, and secure online payments. Track your device repair status instantly." />
        <meta name="keywords" content="Anurag Mobile Repairing Centre, mobile repair, phone repair tracking, screen replacement, battery replacement, smartphone repair, mobile repair near me, repair status, online payment" />
        <link rel="canonical" href="https://tracking.anuragmobile.in/" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "Anurag Mobile Repairing Centre",
          "description": "Expert mobile phone repair services with real-time tracking, genuine spare parts, and secure online payments.",
          "url": "https://tracking.anuragmobile.in",
          "telephone": "+917033067221",
          "email": "anurag.sharma7033@gmail.com",
          "image": "https://tracking.anuragmobile.in/logo.png",
          "priceRange": "₹",
          "serviceType": ["Mobile Phone Repair", "Screen Replacement", "Battery Replacement", "Charging Port Repair", "Software Update", "IC Replacement"],
          "areaServed": "India",
          "sameAs": ["https://anuragmobile.in"]
        })}</script>
      </Helmet>
      {/* Hero */}
      <header className="gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-secondary blur-3xl" />
        </div>
        <nav className="container mx-auto flex items-center justify-between py-4 relative z-10">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Anurag Mobile Logo" className="w-10 h-10 rounded-lg" />
            <div>
              <span className="font-display text-lg font-bold leading-tight">Anurag Mobile</span>
              <p className="text-xs text-primary-foreground/60 leading-tight">Repair Tracking</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
            onClick={() => navigate("/admin")}
          >
            <Shield className="w-4 h-4 mr-2" />
            Admin
          </Button>
        </nav>

        <div className="container mx-auto py-16 md:py-24 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary-foreground/90 text-sm font-medium mb-6 animate-fade-in">
            <Wrench className="w-4 h-4" />
            Trusted Mobile Repair Service
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Track Your Mobile
            <br />
            <span className="text-primary">Repair Status</span>
          </h1>
          <p className="text-primary-foreground/70 text-lg md:text-xl max-w-xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Enter your tracking ID to check the real-time progress of your device repair.
          </p>

          <div className="max-w-md mx-auto flex gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Enter Tracking ID (e.g. MR-A1B2C3)"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                className="pl-10 h-12 bg-card text-card-foreground border-border rounded-xl text-base"
              />
            </div>
            <Button
              onClick={handleTrack}
              className="h-12 px-6 gradient-primary hover:opacity-90 rounded-xl font-semibold"
            >
              Track
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="container mx-auto py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Wrench className="w-6 h-6" />,
              title: "Expert Repairs",
              desc: "Professional technicians for all brands and models.",
            },
            {
              icon: <Clock className="w-6 h-6" />,
              title: "Real-Time Tracking",
              desc: "Track every step of your repair from receiving to delivery.",
            },
            {
              icon: <CreditCard className="w-6 h-6" />,
              title: "Secure Payments",
              desc: "Pay online securely once your device is repaired.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="bg-card rounded-2xl p-6 shadow-card border border-border animate-fade-in"
              style={{ animationDelay: `${0.1 * (i + 1)}s` }}
            >
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground mb-4">
                {f.icon}
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Book Your Repair Assistance */}
      <section className="container mx-auto py-16">
        <div className="max-w-5xl mx-auto bg-card rounded-3xl p-8 md:p-12 shadow-elevated border border-border relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-600 text-xs font-semibold mb-4">
                <Wrench className="w-3.5 h-3.5" />
                Need Help With Your Device?
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Book Your Repair Assistance
              </h2>
              <p className="text-muted-foreground text-base mb-6 leading-relaxed">
                Get instant help from our expert technicians. Whether your screen is cracked, battery is draining fast, or your phone won't charge — we've got you covered with genuine parts and reliable service.
              </p>

              <ul className="space-y-2.5 mb-6">
                {[
                  "Free diagnosis & repair estimate",
                  "Genuine spare parts with warranty",
                  "Same-day service for most repairs",
                  "Pickup & drop available on request",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => navigate("/book-repair")}
                  className="h-12 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/30"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Your Repair Assistance
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open("tel:+917033067221")}
                  className="h-12 px-6 rounded-xl font-semibold border-2"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <Smartphone className="w-5 h-5" />, title: "Screen Repair", desc: "Cracked or broken display" },
                { icon: <Wrench className="w-5 h-5" />, title: "Battery Issues", desc: "Quick draining or swelling" },
                { icon: <CreditCard className="w-5 h-5" />, title: "Charging Port", desc: "Not charging properly" },
                { icon: <Shield className="w-5 h-5" />, title: "Software Fix", desc: "Hang, virus, updates" },
              ].map((s) => (
                <div key={s.title} className="bg-background rounded-2xl p-4 border border-border hover:border-orange-500/40 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center mb-3">
                    {s.icon}
                  </div>
                  <h4 className="font-semibold text-sm text-foreground mb-1">{s.title}</h4>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Voucher Info */}
      <section className="container mx-auto py-16">
        <div className="max-w-2xl mx-auto bg-card rounded-3xl p-6 shadow-elevated border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
              <Tag className="w-4 h-4 text-white" />
            </div>
            <p className="font-semibold text-black text-lg">Add vouchers to get exciting discounts</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-orange-500" />
                <CreditCard className="w-4 h-4 text-orange-500" />
                <Wallet className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-sm text-black font-medium">
                You can pay using online methods (UPI, card, credit cards, wallet, etc.)
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-primary/10">
              <span className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-full">
                *Charges applied on card transaction
              </span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
