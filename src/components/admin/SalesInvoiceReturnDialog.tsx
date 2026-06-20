import { useMemo, useState } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SalesInvoice } from "@/types/salesInvoice";
import { createSalesReturn, getSalesInvoiceById } from "@/lib/salesInvoiceStore";

interface Props {
  invoice: SalesInvoice;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCompleted: (inv: SalesInvoice) => void;
}

interface DraftLine {
  invoiceItemId: string;
  productId: string | null;
  productCode: string;
  productName: string;
  unitPrice: number;
  alreadyReturned: number;
  maxReturnable: number;
  selected: boolean;
  quantity: number;
  refundAmount: number;
  restock: boolean;
}

const SalesInvoiceReturnDialog = ({ invoice, open, onOpenChange, onCompleted }: Props) => {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [saving, setSaving] = useState(false);

  const [lines, setLines] = useState<DraftLine[]>(() =>
    (invoice.items || []).map((it) => {
      const already = it.returnedQuantity || 0;
      const max = Math.max(0, (it.quantity || 0) - already);
      return {
        invoiceItemId: it.id!,
        productId: it.productId,
        productCode: it.productCode,
        productName: it.productName,
        unitPrice: it.unitPrice,
        alreadyReturned: already,
        maxReturnable: max,
        selected: false,
        quantity: max > 0 ? 1 : 0,
        refundAmount: max > 0 ? it.unitPrice : 0,
        restock: true,
      };
    })
  );

  const update = (idx: number, patch: Partial<DraftLine>) =>
    setLines((arr) => arr.map((l, i) => {
      if (i !== idx) return l;
      const next = { ...l, ...patch };
      // Auto-recalc refund when qty changes & user hasn't manually set it (we still allow override)
      if (patch.quantity !== undefined) {
        next.refundAmount = +(next.unitPrice * (patch.quantity || 0)).toFixed(2);
      }
      return next;
    }));

  const selectedLines = useMemo(() => lines.filter((l) => l.selected && l.quantity > 0), [lines]);
  const refundTotal = useMemo(
    () => selectedLines.reduce((s, l) => s + (l.refundAmount || 0), 0),
    [selectedLines]
  );

  const handleSubmit = async () => {
    if (selectedLines.length === 0) {
      toast({ title: "Nothing selected", description: "Pick at least one item to return.", variant: "destructive" });
      return;
    }
    for (const l of selectedLines) {
      if (l.quantity > l.maxReturnable) {
        toast({ title: "Quantity too high", description: `${l.productName}: max ${l.maxReturnable} returnable.`, variant: "destructive" });
        return;
      }
    }
    try {
      setSaving(true);
      await createSalesReturn({
        invoiceId: invoice.id,
        reason,
        refundMethod,
        restock: selectedLines.some((l) => l.restock),
        items: selectedLines.map((l) => ({
          invoiceItemId: l.invoiceItemId,
          productId: l.productId,
          productCode: l.productCode,
          productName: l.productName,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          refundAmount: l.refundAmount,
          restock: l.restock,
        })),
      });
      toast({ title: "Return processed", description: `₹${refundTotal.toLocaleString("en-IN")} refund recorded.` });
      const fresh = await getSalesInvoiceById(invoice.id);
      if (fresh) onCompleted(fresh);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Undo2 className="w-5 h-5" /> Return items — {invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 w-8"></th>
                  <th className="text-left px-2 py-2">Product</th>
                  <th className="text-right px-2 py-2 w-20">Sold</th>
                  <th className="text-right px-2 py-2 w-20">Returned</th>
                  <th className="text-left px-2 py-2 w-24">Return Qty</th>
                  <th className="text-left px-2 py-2 w-28">Refund ₹</th>
                  <th className="text-center px-2 py-2 w-20">Restock</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l.invoiceItemId} className={`border-t border-border ${l.maxReturnable === 0 ? "opacity-50" : ""}`}>
                    <td className="px-2 py-2">
                      <Checkbox
                        checked={l.selected}
                        disabled={l.maxReturnable === 0}
                        onCheckedChange={(v) => update(idx, { selected: !!v })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-semibold">{l.productName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{l.productCode}</div>
                    </td>
                    <td className="px-2 py-2 text-right">{l.maxReturnable + l.alreadyReturned}</td>
                    <td className="px-2 py-2 text-right">{l.alreadyReturned}</td>
                    <td className="px-2 py-2">
                      <Input
                        type="number" min={0} max={l.maxReturnable}
                        value={l.quantity}
                        disabled={!l.selected || l.maxReturnable === 0}
                        onChange={(e) => update(idx, { quantity: Math.min(l.maxReturnable, Math.max(0, Number(e.target.value) || 0)) })}
                        className="h-8 rounded-md"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number" min={0}
                        value={l.refundAmount}
                        disabled={!l.selected}
                        onChange={(e) => update(idx, { refundAmount: Number(e.target.value) || 0 })}
                        className="h-8 rounded-md"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Checkbox
                        checked={l.restock}
                        disabled={!l.selected || !l.productId}
                        onCheckedChange={(v) => update(idx, { restock: !!v })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Refund Method</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod}>
                <SelectTrigger className="rounded-lg mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_note">Credit Note / Adjust to Bill</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reason (optional)</Label>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg mt-1" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
            <div className="text-sm">Total Refund</div>
            <div className="text-lg font-bold text-primary">₹{refundTotal.toLocaleString("en-IN")}</div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="rounded-xl font-semibold" onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Undo2 className="w-4 h-4 mr-2" />}
              Process Return
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesInvoiceReturnDialog;
