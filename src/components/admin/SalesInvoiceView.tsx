import { useState } from "react";
import { Printer, MessageCircle, Wallet, History, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import SalesInvoicePrint from "@/components/admin/SalesInvoicePrint";
import { SalesInvoice, PAYMENT_METHOD_LABELS } from "@/types/salesInvoice";
import { addInvoicePayment } from "@/lib/salesInvoiceStore";

interface Props {
  invoice: SalesInvoice;
  onUpdated: (inv: SalesInvoice) => void;
}

const SHOP_NAME = "Anurag Mobile";

const buildWhatsAppMessage = (inv: SalesInvoice) => {
  const lines = [
    `Hello ${inv.customerName || "Customer"},`,
    ``,
    `Thank you for your purchase from ${SHOP_NAME}.`,
    ``,
    `Your Invoice No: ${inv.invoiceNumber}`,
    `Invoice Amount: ₹${inv.grandTotal.toLocaleString("en-IN")}`,
  ];
  if (inv.remainingAmount > 0) {
    lines.push(`Amount Received: ₹${inv.amountReceived.toLocaleString("en-IN")}`);
    lines.push(`Balance Due: ₹${inv.remainingAmount.toLocaleString("en-IN")}`);
  } else {
    lines.push(`Payment Status: PAID ✓`);
  }
  lines.push(``);
  lines.push(`Please find your invoice attached.`);
  lines.push(``);
  lines.push(`Thank you for choosing ${SHOP_NAME}.`);
  return lines.join("\n");
};

const sanitizePhone = (p: string) => {
  const digits = (p || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const paymentBadge = (s: string) => {
  if (s === "paid") return "bg-success/15 text-success border-success/30";
  if (s === "partial") return "bg-warning/15 text-warning border-warning/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
};

const SalesInvoiceView = ({ invoice, onUpdated }: Props) => {
  const { toast } = useToast();
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(invoice.remainingAmount);
  const [payMethod, setPayMethod] = useState<string>(invoice.paymentMethod || "cash");
  const [payNote, setPayNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handlePrint = () => window.print();

  const handleWhatsApp = () => {
    const phone = sanitizePhone(invoice.customerPhone);
    if (!phone) {
      toast({ title: "No phone", description: "Customer phone is missing.", variant: "destructive" });
      return;
    }
    const msg = encodeURIComponent(buildWhatsAppMessage(invoice));
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  const handleSubmitPayment = async () => {
    if (!payAmount || payAmount <= 0) {
      toast({ title: "Invalid amount", description: "Enter an amount greater than 0.", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const updated = await addInvoicePayment({
        invoiceId: invoice.id,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        note: payNote || undefined,
        updatedBy: "Admin",
      });
      toast({ title: "Payment recorded", description: `₹${payAmount} added. Status: ${updated.paymentStatus.toUpperCase()}` });
      setShowPayment(false);
      setPayAmount(0);
      setPayNote("");
      onUpdated(updated);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action toolbar — hidden when printing */}
      <div className="print:hidden flex flex-wrap gap-2 items-center justify-between">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${paymentBadge(invoice.paymentStatus)}`}>
          {invoice.paymentStatus.toUpperCase()}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="rounded-lg" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg" onClick={handlePrint}>
            <Download className="w-4 h-4 mr-1" /> Save PDF
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg text-green-600 border-green-600/30 hover:bg-green-50" onClick={handleWhatsApp}>
            <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
          </Button>
          {invoice.remainingAmount > 0 && (
            <Button size="sm" className="rounded-lg gradient-primary" onClick={() => { setShowPayment((v) => !v); setPayAmount(invoice.remainingAmount); }}>
              <Wallet className="w-4 h-4 mr-1" /> Update Payment
            </Button>
          )}
        </div>
      </div>

      {/* Update payment form */}
      {showPayment && invoice.remainingAmount > 0 && (
        <div className="print:hidden p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-3">
          <div className="font-semibold text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Record additional payment
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Amount (₹)</Label>
              <Input type="number" min={0} max={invoice.remainingAmount} value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value) || 0)} className="rounded-lg mt-1" />
              <p className="text-[10px] text-muted-foreground mt-1">Balance: ₹{invoice.remainingAmount.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <Label className="text-xs">Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="rounded-lg mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Note (optional)</Label>
              <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} className="rounded-lg mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button size="sm" className="rounded-lg gradient-primary" onClick={handleSubmitPayment} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wallet className="w-4 h-4 mr-1" />}
              Record Payment
            </Button>
          </div>
        </div>
      )}

      {/* Printable invoice */}
      <SalesInvoicePrint invoice={invoice} />

      {/* Payment history */}
      <div className="print:hidden p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 font-semibold text-sm mb-3">
          <History className="w-4 h-4" /> Payment History
        </div>
        {(!invoice.payments || invoice.payments.length === 0) ? (
          <p className="text-xs text-muted-foreground">
            No subsequent payments recorded. Initial amount received: ₹{invoice.amountReceived.toLocaleString("en-IN")}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-right py-2 px-2">Amount</th>
                  <th className="text-right py-2 px-2">Prev. Balance</th>
                  <th className="text-right py-2 px-2">New Balance</th>
                  <th className="text-left py-2 px-2">Method</th>
                  <th className="text-left py-2 px-2">By</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 px-2">
                      {new Date(p.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-success">
                      + ₹{p.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 px-2 text-right">₹{p.previousBalance.toLocaleString("en-IN")}</td>
                    <td className="py-2 px-2 text-right font-semibold">₹{p.newBalance.toLocaleString("en-IN")}</td>
                    <td className="py-2 px-2">{p.paymentMethod ? PAYMENT_METHOD_LABELS[p.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] || p.paymentMethod : "—"}</td>
                    <td className="py-2 px-2">{p.updatedBy || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesInvoiceView;
