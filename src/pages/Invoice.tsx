import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { findByTrackingId } from "@/lib/repairStore";
import { RepairOrder } from "@/types/repair";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Loader2 } from "lucide-react";
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
  method: string;
  amount: number;
  created_at: number;
  transaction_id: string;
  vpa?: string;
  bank?: string;
  card_last4?: string;
}

const SHOP = {
  name: "Anurag Mobile Repairing Centre",
  address: "anurag mobile, vikram nagar near tooti diwal",
  phone: "7033067221",
  state: "09-Uttar Pradesh",
  email: "anurag.sharma7033@gmail.com",
};

const BANK = {
  account: "003321712591467",
  ifsc: "JIOP0000001",
  holder: "Anurag Sharma",
};

const formatDateShort = (ts: number | string) => {
  const d = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const formatINR = (n: number) =>
  "₹ " + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Number to Indian English words (integer rupees)
function numberToWords(num: number): string {
  if (num === 0) return "Zero Rupees only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + inWords(n % 100) : "");
    return "";
  };
  const n = Math.floor(num);
  let result = "";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) result += inWords(crore) + " Crore ";
  if (lakh) result += inWords(lakh) + " Lakh ";
  if (thousand) result += inWords(thousand) + " Thousand ";
  if (rest) result += inWords(rest);
  return result.trim() + " Rupees only";
}

// Generate invoice number from tracking id + date
function genInvoiceNo(order: RepairOrder): string {
  const d = new Date(order.createdAt);
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  const suffix = order.trackingId.replace(/[^0-9]/g, "").slice(-4) || "0001";
  return `${day}-${month}-${suffix}`;
}

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

  const normalized = serviceItems.length > 0
    ? serviceItems.map((it) => ({
        name: it.name || it.service || "Service",
        description: it.description || "",
        quantity: it.quantity && it.quantity > 0 ? it.quantity : 1,
        price: Number(it.price) || 0,
      }))
    : [{
        name: "General Repair Service",
        description: order.issueDescription || "",
        quantity: 1,
        price: Number(order.quotation),
      }];

  const grossSubtotal = normalized.reduce((s, it) => s + it.quantity * it.price, 0);
  const totalQty = normalized.reduce((s, it) => s + it.quantity, 0);
  const totalDiscount = Number(order.discountAmount || 0);
  // Distribute discount proportionally across items for display
  const itemsWithDiscount = normalized.map((it) => {
    const itemGross = it.quantity * it.price;
    const itemDiscount = grossSubtotal > 0 ? (itemGross / grossSubtotal) * totalDiscount : 0;
    const discountPct = itemGross > 0 ? (itemDiscount / itemGross) * 100 : 0;
    return { ...it, gross: itemGross, discount: itemDiscount, discountPct, amount: itemGross - itemDiscount };
  });

  const subTotal = grossSubtotal;
  const finalTotal = Math.max(0, subTotal - totalDiscount);
  const onlinePaid = payments.reduce((s, p) => s + p.amount, 0);
  const advancePaid = Number(order.advancePaid || 0);
  const totalReceived = Math.max(advancePaid, onlinePaid);
  const balance = Math.max(0, finalTotal - totalReceived);
  const paymentMode = onlinePaid > 0
    ? (payments[0]?.method ? payments[0].method.toUpperCase() : "Online")
    : (advancePaid > 0 ? "Cash" : "Pending");

  return (
    <div className="min-h-screen bg-gray-100 py-6 print:bg-white print:py-0">
      {/* Action Bar - hidden on print */}
      <div className="max-w-[820px] mx-auto px-4 mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold text-gray-800">Invoice Preview</h1>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium shadow"
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Invoice Sheet */}
      <div className="max-w-[820px] mx-auto bg-white shadow-lg print:shadow-none p-8 print:p-4 text-black" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        {/* Top header row: Tax Invoice | Original */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-slate-800">Tax Invoice</h1>
          <span className="text-sm font-semibold text-slate-600 tracking-wide">ORIGINAL FOR RECIPIENT</span>
        </div>

        {/* Outer bordered container */}
        <div className="border border-gray-400">
          {/* Shop header */}
          <div className="p-4 flex items-start gap-3 border-b border-gray-400">
            <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-800 leading-tight">{SHOP.name}</h2>
              <p className="text-sm text-slate-700 mt-1">{SHOP.address}</p>
              <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm mt-1">
                <span>Phone: <strong>{SHOP.phone}</strong></span>
                <span>Email: <strong>{SHOP.email}</strong></span>
              </div>
              <p className="text-sm">State: <strong>{SHOP.state}</strong></p>
            </div>
          </div>

          {/* Bill To / Invoice Details */}
          <div className="grid grid-cols-2 border-b border-gray-400">
            <div className="p-4 border-r border-gray-400">
              <p className="text-sm font-bold mb-2 bg-gray-100 -m-4 mb-2 px-4 py-1.5">Bill To:</p>
              <p className="font-bold text-base">{order.customerName}</p>
              <p className="text-sm mt-1">Contact No: <strong>{order.customerPhone}</strong></p>
              {order.mobileBrand && (
                <p className="text-sm mt-1">Device: <strong>{order.mobileBrand} {order.mobileModel}</strong></p>
              )}
              {order.imeiNumber && <p className="text-sm">IMEI: <strong>{order.imeiNumber}</strong></p>}
            </div>
            <div className="p-4">
              <p className="text-sm font-bold mb-2 bg-gray-100 -m-4 mb-2 px-4 py-1.5">Invoice Details:</p>
              <p className="text-sm">No: <strong>{genInvoiceNo(order)}</strong></p>
              <p className="text-sm mt-1">Date: <strong>{formatDateShort(order.createdAt)}</strong></p>
              <p className="text-sm mt-1">Order ID: <strong className="font-mono">{order.trackingId}</strong></p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-400">
                <th className="text-left p-2 border-r border-gray-400 w-8">#</th>
                <th className="text-left p-2 border-r border-gray-400">Item Name</th>
                <th className="text-left p-2 border-r border-gray-400 w-20">HSN/ SAC</th>
                <th className="text-center p-2 border-r border-gray-400 w-16">Quantity</th>
                <th className="text-right p-2 border-r border-gray-400 w-24">Price/ Unit (₹)</th>
                <th className="text-right p-2 border-r border-gray-400 w-28">Discount (₹)</th>
                <th className="text-right p-2 w-24">Amount(₹)</th>
              </tr>
            </thead>
            <tbody>
              {itemsWithDiscount.map((it, idx) => (
                <tr key={idx} className="border-b border-gray-300 align-top">
                  <td className="p-2 border-r border-gray-300">{idx + 1}</td>
                  <td className="p-2 border-r border-gray-300">
                    <div className="font-bold uppercase">{it.name}</div>
                    {it.description && <div className="text-xs text-gray-600 mt-0.5">{it.description}</div>}
                  </td>
                  <td className="p-2 border-r border-gray-300"></td>
                  <td className="p-2 border-r border-gray-300 text-center">{it.quantity}</td>
                  <td className="p-2 border-r border-gray-300 text-right">{formatINR(it.price)}</td>
                  <td className="p-2 border-r border-gray-300 text-right">
                    {formatINR(it.discount)}
                    {it.discount > 0 && (
                      <div className="text-xs text-gray-600">({it.discountPct.toFixed(3)}%)</div>
                    )}
                  </td>
                  <td className="p-2 text-right">{formatINR(it.amount)}</td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="border-b border-gray-400 bg-gray-50 font-semibold">
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300">Total</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300 text-center font-bold">{totalQty}</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300 text-right font-bold">{formatINR(totalDiscount)}</td>
                <td className="p-2 text-right font-bold">{formatINR(finalTotal)}</td>
              </tr>
            </tbody>
          </table>

          {/* Bottom: Payment mode (left) + Totals (right) */}
          <div className="grid grid-cols-2 border-t border-gray-400">
            <div className="border-r border-gray-400">
              {/* Empty spacer to mimic Vyapar layout */}
              <div className="h-32"></div>
              <div className="border-t border-gray-400 p-3">
                <p className="text-sm font-bold">Payment Mode:</p>
                <p className="text-sm mt-1">{paymentMode}</p>
                {payments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {payments.map((p) => (
                      <p key={p.payment_id} className="text-xs text-gray-700">
                        {p.method.toUpperCase()} • {formatINR(p.amount)} • <span className="font-mono">{p.transaction_id}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm">
              <div className="flex justify-between p-2 border-b border-gray-300">
                <span>Sub Total</span>
                <span className="font-semibold">: &nbsp;&nbsp; {formatINR(subTotal)}</span>
              </div>
              <div className="flex justify-between p-2 border-b border-gray-400 bg-gray-50">
                <span className="font-bold">Total</span>
                <span className="font-bold">: &nbsp;&nbsp; {formatINR(finalTotal)}</span>
              </div>
              <div className="p-2 border-b border-gray-300">
                <p className="font-bold text-sm">Invoice Amount In Words :</p>
                <p className="text-sm mt-1">{numberToWords(finalTotal)}</p>
              </div>
              <div className="flex justify-between p-2 border-b border-gray-300">
                <span>Received</span>
                <span>: &nbsp;&nbsp; {formatINR(totalReceived)}</span>
              </div>
              <div className="flex justify-between p-2 border-b border-gray-300">
                <span>Balance</span>
                <span className={balance > 0 ? "text-red-700 font-semibold" : ""}>: &nbsp;&nbsp; {formatINR(balance)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between p-2">
                  <span>You Saved</span>
                  <span className="text-green-700">: &nbsp;&nbsp; {formatINR(totalDiscount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="border-t border-gray-400 p-3">
            <p className="text-sm font-bold bg-gray-100 -mx-3 -mt-3 px-3 py-1.5 mb-2">Terms And Conditions:</p>
            <p className="text-sm">Thank you for doing business with us.</p>
          </div>

          {/* Bank Details + Signatory */}
          <div className="grid grid-cols-2 border-t border-gray-400">
            <div className="p-3 border-r border-gray-400">
              <p className="text-sm font-bold bg-gray-100 -mx-3 -mt-3 px-3 py-1.5 mb-2">Bank Details:</p>
              <p className="text-sm">Account No.: <strong>{BANK.account}</strong></p>
              <p className="text-sm">IFSC code: <strong>{BANK.ifsc}</strong></p>
              <p className="text-sm">Account Holder's Name: <strong>{BANK.holder}</strong></p>
            </div>
            <div className="p-3">
              <p className="text-sm font-bold bg-gray-100 -mx-3 -mt-3 px-3 py-1.5 mb-2">For {SHOP.name}:</p>
              <div className="h-16"></div>
              <p className="text-sm text-center font-semibold">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
};

export default Invoice;
