import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cartStore";

interface Props {
  variant?: "dark" | "light";
}

const CartIconButton = ({ variant = "dark" }: Props) => {
  const cart = useCart();
  const count = cart.reduce((s, c) => s + c.quantity, 0);
  const base =
    variant === "dark"
      ? "bg-white/5 hover:bg-white/10 text-white"
      : "bg-muted hover:bg-muted/70 text-foreground";
  return (
    <Link
      to="/cart"
      aria-label={`Cart with ${count} items`}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors ${base}`}
    >
      <ShoppingCart className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-[#0b0b12]">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
};

export default CartIconButton;
