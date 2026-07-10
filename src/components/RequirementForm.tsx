import { useState } from "react";
import { Plus, X, Send, ClipboardList, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitRequirement } from "@/lib/requirementStore";

const RequirementForm = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [itemInput, setItemInput] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [reqId, setReqId] = useState<string>("");


  const addItem = () => {
    const v = itemInput.trim();
    if (!v) return;
    if (v.length > 120) return toast.error("Item too long (max 120 chars)");
    setItems((p) => [...p, v]);
    setItemInput("");
  };

  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!name.trim() || name.trim().length > 80) return toast.error("Enter a valid name");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return toast.error("Enter a valid mobile number");
    if (items.length === 0) return toast.error("Add at least one item");
    setSubmitting(true);
    try {
      const created = await submitRequirement({
        customer_name: name.trim(),
        customer_phone: digits.slice(-10),
        items,
        notes: notes.trim() || undefined,
      });
      setReqId(created.requirement_id);
      setDone(true);
      setName(""); setPhone(""); setItems([]); setNotes(""); setItemInput("");
      toast.success(`Requirement submitted! ID: ${created.requirement_id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };


  if (done) {
    return (
      <div className="bg-card rounded-2xl p-8 text-center border border-border">
        <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
        <h3 className="font-display text-xl font-bold mb-2">Requirement Received!</h3>
        {reqId && (
          <div className="mb-3 inline-block bg-primary/10 border border-primary/30 rounded-lg px-4 py-2">
            <p className="text-xs text-muted-foreground">Your Requirement ID</p>
            <p className="font-mono font-bold text-primary text-lg">{reqId}</p>
          </div>
        )}
        <p className="text-muted-foreground text-sm mb-4">
          Save this ID. Our team will reach out to you on WhatsApp once your items are available.
        </p>
        <Button onClick={() => { setDone(false); setReqId(""); }} variant="outline">Submit Another</Button>

      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-card space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="req-name" className="text-sm font-medium mb-1.5 block">Your Name</label>
          <Input id="req-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div>
          <label htmlFor="req-phone" className="text-sm font-medium mb-1.5 block">Mobile Number</label>
          <Input id="req-phone" value={phone} maxLength={15} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" inputMode="numeric" />
        </div>
      </div>

      <div>
        <label htmlFor="req-item" className="text-sm font-medium mb-1.5 block">Required Items</label>
        <div className="flex gap-2">
          <Input
            id="req-item"
            value={itemInput}
            maxLength={120}
            onChange={(e) => setItemInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
            placeholder="e.g. iPhone 15 back cover"
          />
          <Button type="button" onClick={addItem} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
        {items.length > 0 && (
          <ul className="mt-3 space-y-2">
            {items.map((it, i) => (
              <li key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-sm">{i + 1}. {it}</span>
                <button type="button" onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label htmlFor="req-notes" className="text-sm font-medium mb-1.5 block">Additional Notes (optional)</label>
        <Textarea id="req-notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Any brand, color, or model preference..." rows={3} />
      </div>

      <Button onClick={submit} disabled={submitting} className="w-full h-11 gradient-primary rounded-xl font-semibold">
        <Send className="w-4 h-4 mr-2" />
        {submitting ? "Submitting..." : "Submit Requirement"}
      </Button>

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <ClipboardList className="w-3 h-3" />
        We'll notify you on WhatsApp when items are ready.
      </p>
    </div>
  );
};

export default RequirementForm;
