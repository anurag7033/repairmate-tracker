import { useState } from "react";
import { Search, Smartphone, Shield, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [trackingId, setTrackingId] = useState("");
  const navigate = useNavigate();

  const handleTrack = () => {
    if (trackingId.trim()) {
      navigate(`/track/${trackingId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <header className="gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-secondary blur-3xl" />
        </div>
        <nav className="container mx-auto flex items-center justify-between py-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">FixTrack</span>
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
            <Smartphone className="w-4 h-4" />
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
              icon: <Smartphone className="w-6 h-6" />,
              title: "Expert Repairs",
              desc: "Professional technicians for all brands and models.",
            },
            {
              icon: <Search className="w-6 h-6" />,
              title: "Real-Time Tracking",
              desc: "Track every step of your repair from receiving to delivery.",
            },
            {
              icon: <Shield className="w-6 h-6" />,
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

      {/* Footer */}
      <footer className="mt-auto gradient-hero text-primary-foreground/60 py-6 text-center text-sm">
        © 2026 FixTrack. All rights reserved.
      </footer>
    </div>
  );
};

export default Index;
