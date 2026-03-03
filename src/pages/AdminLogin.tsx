import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { verifyAdmin } from "@/lib/repairStore";
import { useToast } from "@/hooks/use-toast";

const AdminLogin = () => {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = () => {
    if (verifyAdmin(password)) {
      sessionStorage.setItem("admin_auth", "true");
      navigate("/admin/dashboard");
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect password. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Button
          variant="ghost"
          className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-8"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="bg-card rounded-2xl p-8 shadow-elevated animate-fade-in">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-center mb-2">Admin Login</h1>
          <p className="text-muted-foreground text-center text-sm mb-6">
            Enter password to access dashboard
          </p>

          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="pl-10 h-12 rounded-xl"
              />
            </div>
            <Button
              onClick={handleLogin}
              className="w-full h-12 gradient-primary hover:opacity-90 rounded-xl font-semibold"
            >
              Login
            </Button>
          </div>
          <p className="text-muted-foreground text-xs text-center mt-4">
            Default password: admin123
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
