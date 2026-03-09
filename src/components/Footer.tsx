import { Phone, Mail, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="gradient-hero text-primary-foreground/80 mt-auto">
      <div className="container mx-auto py-10 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Anurag Mobile Logo" className="w-10 h-10 rounded-lg" />
              <div>
                <span className="font-display text-lg font-bold text-primary-foreground">Anurag Mobile</span>
                <p className="text-xs text-primary-foreground/50">Repairing Centre</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-primary-foreground/60 mb-4">
              Your trusted destination for professional mobile phone repair and accessories. Quick diagnostics, genuine spare parts, and reliable repair solutions for all major smartphone brands.
            </p>
            <p className="text-xs text-primary/80 font-medium">Fast • Reliable • Affordable Mobile Solutions</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display text-base font-bold text-primary-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { label: "Home", href: "https://anuragmobile.in" },
                { label: "Services", href: "https://anuragmobile.in/services" },
                { label: "Gallery", href: "https://anuragmobile.in/gallery" },
                { label: "About", href: "https://anuragmobile.in/about" },
                { label: "Contact", href: "https://anuragmobile.in/contact" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/60 hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display text-base font-bold text-primary-foreground mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm">7033067221 (Primary)</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm">9304490107</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm">anurag.sharma7033@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-primary-foreground/10">
        <div className="container mx-auto py-4 px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-primary-foreground/40">
            © 2026 Anurag Mobile Repairing Centre. All rights reserved.
          </p>
          <p className="text-xs text-primary-foreground/40 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Your Local Mobile Repair Expert
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
