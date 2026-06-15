import { SalesInvoice, PAYMENT_METHOD_LABELS } from "@/types/salesInvoice";
import logo from "@/assets/logo.png";

interface Props {
  invoice: SalesInvoice;
}

const SHOP = {
  name: "Anurag Mobile Repairing Centre",
  address: "Vikram Nagar, Near Tooti Diwal",
  phone: "7033067221",
  email: "anurag.sharma7033@gmail.com",
};

const fmt = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SalesInvoicePrint = ({ invoice }: Props) => {
  const d = new Date(invoice.createdAt);
  const dateStr = d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  const paymentBadge =
    invoice.paymentStatus === "paid" ? "bg-success text-success-foreground"
    : invoice.paymentStatus === "partial" ? "bg-warning text-warning-foreground"
    : "bg-destructive text-destructive-foreground";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden; }
          #sales-invoice-print, #sales-invoice-print * { visibility: visible; }
          #sales-invoice-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      <div id="sales-invoice-print" className="bg-white text-black p-6 rounded-xl border border-border">
        <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-14 h-14 rounded-lg" />
            <div>
              <h2 className="text-xl font-bold">{SHOP.name}</h2>
              <p className="text-xs text-gray-600">{SHOP.address}</p>
              <p className="text-xs text-gray-600">📞 {SHOP.phone} • ✉ {SHOP.email}</p>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-lg font-bold uppercase tracking-wide">Sales Invoice</h3>
            <p className="text-xs"><span className="font-semibold">No:</span> {invoice.invoiceNumber}</p>
            <p className="text-xs"><span className="font-semibold">Date:</span> {dateStr}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${paymentBadge}`}>
              {invoice.paymentStatus.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div>
            <div className="font-bold text-gray-700 mb-1">Billed To</div>
            <div className="font-semibold">{invoice.customerName}</div>
            <div>📞 {invoice.customerPhone}</div>
            {invoice.customerAltPhone && <div>Alt: {invoice.customerAltPhone}</div>}
            {invoice.customerEmail && <div>{invoice.customerEmail}</div>}
            {invoice.customerAddress && <div>{invoice.customerAddress}</div>}
            {invoice.customerGst && <div><span className="font-semibold">GSTIN:</span> {invoice.customerGst}</div>}
          </div>
          <div className="text-right">
            <div className="font-bold text-gray-700 mb-1">Payment</div>
            <div>Method: {PAYMENT_METHOD_LABELS[invoice.paymentMethod]}</div>
            <div>Received: {fmt(invoice.amountReceived)}</div>
            {invoice.changeReturned > 0 && <div>Change Returned: {fmt(invoice.changeReturned)}</div>}
            {invoice.remainingAmount > 0 && <div className="text-red-600 font-semibold">Balance Due: {fmt(invoice.remainingAmount)}</div>}
          </div>
        </div>

        <table className="w-full text-xs border-collapse mb-4">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border border-gray-300 px-2 py-1">#</th>
              <th className="border border-gray-300 px-2 py-1">Product</th>
              <th className="border border-gray-300 px-2 py-1">Code</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Qty</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Price</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Discount</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((it, i) => (
              <tr key={it.id || i}>
                <td className="border border-gray-300 px-2 py-1">{i + 1}</td>
                <td className="border border-gray-300 px-2 py-1">{it.productName}</td>
                <td className="border border-gray-300 px-2 py-1 font-mono">{it.productCode}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{it.quantity}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{fmt(it.unitPrice)}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{fmt(it.discount)}</td>
                <td className="border border-gray-300 px-2 py-1 text-right font-semibold">{fmt(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-4">
          <div className="w-72 text-xs space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{fmt(invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span>Product Discounts</span><span>− {fmt(invoice.productDiscountTotal)}</span></div>
            <div className="flex justify-between"><span>Invoice Discount</span><span>− {fmt(invoice.invoiceDiscount)}</span></div>
            {invoice.gstAmount > 0 && (
              <div className="flex justify-between"><span>GST ({invoice.gstPercent}%)</span><span>+ {fmt(invoice.gstAmount)}</span></div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-gray-400 pt-1">
              <span>Grand Total</span><span>{fmt(invoice.grandTotal)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="text-xs mb-3"><span className="font-semibold">Notes:</span> {invoice.notes}</div>
        )}

        <div className="text-center text-[10px] text-gray-500 border-t pt-2">
          Thank you for your purchase. This is a computer-generated invoice and does not require a signature.
        </div>
      </div>
    </>
  );
};

export default SalesInvoicePrint;
