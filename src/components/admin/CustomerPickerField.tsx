import { useEffect, useRef, useState } from "react";
import { Search, UserPlus, Loader2, X, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Customer } from "@/types/customer";
import { searchCustomers, createCustomer } from "@/lib/customerStore";
import { getRequirementByCode, CustomerRequirement } from "@/lib/requirementStore";

interface Props {
  value: Customer | null;
  onSelect: (c: Customer) => void;
  onClear?: () => void;
  onRequirementLoaded?: (req: CustomerRequirement) => void;
}


const CustomerPickerField = ({ value, onSelect, onClear, onRequirementLoaded }: Props) => {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCust, setNewCust] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [loadingReq, setLoadingReq] = useState(false);

  const looksLikeReqId = /^req[- ]?\d/i.test(query.trim());

  const loadRequirement = async () => {
    const code = query.trim().toUpperCase().replace(/\s+/g, "-");
    setLoadingReq(true);
    try {
      const req = await getRequirementByCode(code);
      if (!req) { toast({ title: "Not found", description: `No requirement with ID ${code}`, variant: "destructive" }); return; }
      // Find or create customer from requirement phone
      const existing = await searchCustomers(req.customer_phone);
      let cust: Customer;
      if (existing.length > 0) cust = existing[0];
      else cust = await createCustomer({ name: req.customer_name, phone: req.customer_phone });
      onSelect(cust);
      onRequirementLoaded?.(req);
      setOpen(false);
      setQuery("");
      toast({ title: "Requirement loaded", description: `${req.requirement_id} • ${req.customer_name}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoadingReq(false); }
  };



  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const data = await searchCustomers(query);
        setResults(data);
      } finally {
        setSearching(false);
      }
    }, 200);
  }, [query, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCreate = async () => {
    if (!newCust.name.trim() || !newCust.phone.trim()) {
      toast({ title: "Missing fields", description: "Name and phone are required.", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const created = await createCustomer(newCust);
      toast({ title: "Customer added", description: created.name });
      onSelect(created);
      setCreateOpen(false);
      setNewCust({ name: "", phone: "", email: "", address: "", notes: "" });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {value ? (
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-input bg-background">
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{value.name || "(unnamed)"}</div>
            <div className="text-xs text-muted-foreground truncate">{value.phone}{value.email ? ` • ${value.email}` : ""}</div>
          </div>
          <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onClear?.()}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or Requirement ID (REQ-...)"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              className="pl-10 rounded-lg"
            />

          </div>
          {open && (
            <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {looksLikeReqId && (
                <button
                  type="button"
                  disabled={loadingReq}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 border-b border-border flex items-center gap-2"
                  onClick={loadRequirement}
                >
                  {loadingReq ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                  Load Requirement {query.trim().toUpperCase()}
                </button>
              )}

              {searching ? (
                <div className="p-3 text-sm text-muted-foreground flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" />Searching...</div>
              ) : results.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No matching customer.</div>
              ) : (
                results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b border-border last:border-0"
                    onClick={() => { onSelect(c); setOpen(false); setQuery(""); }}
                  >
                    <div className="text-sm font-semibold">{c.name || "(unnamed)"}</div>
                    <div className="text-xs text-muted-foreground">{c.phone}{c.email ? ` • ${c.email}` : ""}</div>
                  </button>
                ))
              )}
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 border-t border-border flex items-center gap-2"
                onClick={() => { setCreateOpen(true); setNewCust((s) => ({ ...s, name: query.match(/\d/) ? "" : query, phone: query.match(/^\+?\d/) ? query : "" })); }}
              >
                <UserPlus className="w-4 h-4" />Add new customer
              </button>
            </div>
          )}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Add New Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} className="rounded-lg mt-1" />
            </div>
            <div>
              <Label className="text-xs">Phone *</Label>
              <Input value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} placeholder="919876543210" className="rounded-lg mt-1" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={newCust.email} onChange={(e) => setNewCust({ ...newCust, email: e.target.value })} className="rounded-lg mt-1" />
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Textarea value={newCust.address} onChange={(e) => setNewCust({ ...newCust, address: e.target.value })} className="rounded-lg mt-1" rows={2} />
            </div>
            <Button onClick={handleCreate} disabled={saving} className="w-full gradient-primary rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Save Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerPickerField;
