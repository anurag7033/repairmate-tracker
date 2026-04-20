import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { findByTrackingId } from "@/lib/repairStore";
import { RepairOrder } from "@/types/repair";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Download, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

interface ServiceItem {
  service?: string;
  name?: string;
  description?: string;
  quantity?: number;
  price: number;
}

interface PaymentRecord {
  payment_id: string;
  order_id?: string;
  method: string;
  amount: number;
  created_at: number;
  transaction_id: string;
  vpa?: string;
  bank?: string;
  card_last4?: string;
}

const SHOP = {
  name: "Anurag Mobile",
  address: "Shop No. 12, Main Market, Your City, India",
  phone: "+91 98765 43210",
};

const formatDate = (ts: number | string) => {
  const d = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const Invoice = () => {
  const { trackingId } = useParams();
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!trackingId) return;
      const found = await findByTrackingId(trackingId);
      if (found) {
        setOrder(found);
        // Fetch payment details (non-blocking)
        try {
          const { data } = await supabase.functions.invoke("get-payment-details", {
            body: { trackingId: found.trackingId },
          });
          if (data?.payments) setPayments(data.payments);
        } catch (e) {
          console.warn("Failed to fetch payment details", e);
        }
      }
      setLoading(false);
    };
    load();
  }, [trackingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-700">Invoice not found for {trackingId}</p>
      </div>
    );
  }

  // Parse service items
  let serviceItems: ServiceItem[] = [];
  try {
    const parsed = JSON.parse(order.repairDetails || "[]");
    if (Array.isArray(parsed)) serviceItems = parsed;
  } catch {}

  const normalized = serviceItems.map((it) => ({
    name: it.name || it.service || "Service",
    description: it.description || "-",
    quantity: it.quantity && it.quantity > 0 ? it.quantity : 1,
    price: Number(it.price) || 0,
  }));

  const hasItems = normalized.length > 0;
  const subtotal = hasItems
    ? normalized.reduce((s, it) => s + it.quantity * it.price, 0)
    : Number(order.quotation);

  const discount = Number(order.discountAmount || 0);
  const finalTotal = Math.max(0, subtotal - discount);
  const onlinePaid = payments.reduce((s, p) => s + p.amount, 0);
  const advancePaid = Number(order.advancePaid || 0);
  // Total paid: prefer online + cash advance (order.advance_paid already includes online when webhook fires)
  // To prevent double-counting: if advancePaid >= onlinePaid (webhook updated it to full), use advancePaid only.
  const totalPaid = Math.max(advancePaid, onlinePaid);
  const cashAdvance = Math.max(0, advancePaid - onlinePaid);
  const balanceDue = Math.max(0, finalTotal - totalPaid);
  const isPaid = balanceDue === 0 && totalPaid > 0;

  return (
    <div className="min-h-screen bg-gray-100 py-6 print:bg-white print:py-0">
      {/* Action Bar - hidden on print */}
      <div className="max-w-3xl mx-auto px-4 mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold text-gray-800">Invoice Preview</h1>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium shadow"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Invoice Sheet */}
      <div className="max-w-3xl mx-auto bg-white shadow-lg print:shadow-none p-8 print:p-6 text-black text-sm">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-14 h-14 object-contain" />
            <div>
              <h1 className="text-2xl font-bold">{SHOP.name}</h1>
              <p className="text-xs text-gray-700">{SHOP.address}</p>
              <p className="text-xs text-gray-700">Phone: {SHOP.phone}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">INVOICE</h2>
            <p className="text-xs">Order ID: <span className="font-mono font-semibold">{order.trackingId}</span></p>
            <p className="text-xs">Date: {formatDate(order.createdAt)}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-bold rounded ${
              isPaid ? "bg-green-600 text-white" : balanceDue > 0 ? "bg-red-600 text-white" : "bg-gray-300 text-black"
            }`}>
              {isPaid ? "PAID" : `DUE ₹${balanceDue}`}
            </span>
          </div>
        </div>

        {/* Customer & Device */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <h3 className="font-bold text-xs uppercase text-gray-600 mb-1">Bill To</h3>
            <p className="font-semibold">{order.customerName}</p>
            <p className="text-xs">{order.customerPhone}</p>
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase text-gray-600 mb-1">Device</h3>
            <p className="font-semibold">{order.mobileBrand} {order.mobileModel}</p>
            {order.imeiNumber && <p className="text-xs">IMEI: {order.imeiNumber}</p>}
            {order.issueDescription && (
              <p className="text-xs text-gray-700 mt-1">Issue: {order.issueDescription}</p>
            )}
          </div>
        </div>

        {/* Service Table */}
        <h3 className="font-bold text-sm mb-2 border-b border-gray-300 pb-1">Service / Repair Details</h3>
        <table className="w-full mb-5 border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-400">
              <th className="text-left p-2 w-10">#</th>
              <th className="text-left p-2">Service</th>
              <th className="text-left p-2">Description</th>
              <th className="text-center p-2 w-12">Qty</th>
              <th className="text-right p-2 w-20">Unit ₹</th>
              <th className="text-right p-2 w-20">Total ₹</th>
            </tr>
          </thead>
          <tbody>
            {hasItems ? (
              normalized.map((it, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="p-2">{idx + 1}</td>
                  <td className="p-2 font-medium">{it.name}</td>
                  <td className="p-2 text-gray-700">{it.description}</td>
                  <td className="p-2 text-center">{it.quantity}</td>
                  <td className="p-2 text-right">{it.price.toLocaleString("en-IN")}</td>
                  <td className="p-2 text-right font-medium">{(it.quantity * it.price).toLocaleString("en-IN")}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td className="p-2">1</td>
                <td className="p-2 font-medium">General Repair Service</td>
                <td className="p-2 text-gray-700">{order.issueDescription || "-"}</td>
                <td className="p-2 text-center">1</td>
                <td className="p-2 text-right">{subtotal.toLocaleString("en-IN")}</td>
                <td className="p-2 text-right font-medium">{subtotal.toLocaleString("en-IN")}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pricing Summary */}
        <div className="flex justify-end mb-5">
          <div className="w-64 text-xs">
            <div className="flex justify-between py-1">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString("en-IN")}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between py-1 text-gray-700">
                <span>Voucher Discount</span>
                <span>- ₹{discount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-t border-gray-400 font-bold text-sm">
              <span>Final Total</span>
              <span>₹{finalTotal.toLocaleString("en-IN")}</span>
            </div>
            {totalPaid > 0 && (
              <div className="flex justify-between py-1 text-green-700">
                <span>Total Paid</span>
                <span>- ₹{totalPaid.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className={`flex justify-between py-1 border-t-2 border-black font-bold ${
              balanceDue > 0 ? "text-red-700" : "text-green-700"
            }`}>
              <span>Balance Due</span>
              <span>₹{balanceDue.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <h3 className="font-bold text-sm mb-2 border-b border-gray-300 pb-1">Payment History</h3>
        {payments.length === 0 && cashAdvance === 0 ? (
          <p className="text-xs text-gray-600 italic mb-4">No payments recorded yet.</p>
        ) : (
          <table className="w-full mb-5 border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-400">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Method</th>
                <th className="text-left p-2">Transaction ID</th>
                <th className="text-right p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {cashAdvance > 0 && (
                <tr className="border-b border-gray-200">
                  <td className="p-2">{formatDate(order.createdAt)}</td>
                  <td className="p-2 uppercase">Cash</td>
                  <td className="p-2 text-gray-700">Paid via Cash</td>
                  <td className="p-2 text-right font-medium">₹{cashAdvance.toLocaleString("en-IN")}</td>
                </tr>
              )}
              {payments.map((p) => (
                <tr key={p.payment_id} className="border-b border-gray-200">
                  <td className="p-2">{formatDate(p.created_at)}</td>
                  <td className="p-2 uppercase">{p.method}</td>
                  <td className="p-2 font-mono text-[10px]">{p.transaction_id}</td>
                  <td className="p-2 text-right font-medium">₹{p.amount.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-600">
          <p className="font-semibold">Thank you for choosing {SHOP.name}!</p>
          <p>For queries, contact {SHOP.phone}</p>
          <p className="mt-2 text-[10px]">This is a computer-generated invoice.</p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
};

export default Invoice;
