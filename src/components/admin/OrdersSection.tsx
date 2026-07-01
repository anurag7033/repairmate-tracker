import { ShoppingBag } from "lucide-react";

const OrdersSection = () => {
  return (
    <div className="bg-card rounded-2xl border border-border p-10 text-center shadow-card">
      <div className="w-14 h-14 mx-auto rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center mb-4">
        <ShoppingBag className="w-7 h-7" />
      </div>
      <h2 className="font-display text-2xl font-bold mb-2">Customer Orders</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Online product orders placed by customers from the home page will appear here.
        Setup pending — awaiting order button destination and fields.
      </p>
    </div>
  );
};

export default OrdersSection;
