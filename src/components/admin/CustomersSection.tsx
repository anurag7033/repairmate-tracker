import { useEffect, useState, useMemo } from "react";
import { Search, Users, Phone, Mail, Eye, Edit, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CustomerWithStats } from "@/types/customer";
import { getCustomersWithStats, deleteCustomer } from "@/lib/customerStore";
import CustomerDetailsDialog from "./CustomerDetailsDialog";

type SortKey = "latest" | "most_repairs" | "name";

const CustomersSection = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("latest");
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await getCustomersWithStats();
      setCustomers(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = customers;
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (sortKey === "latest") sorted.sort((a, b) => +new Date(b.lastVisit || b.createdAt) - +new Date(a.lastVisit || a.createdAt));
    else if (sortKey === "most_repairs") sorted.sort((a, b) => b.totalRepairs - a.totalRepairs);
    else sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [customers, search, sortKey]);

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id);
      toast({ title: "Deleted", description: "Customer removed." });
      refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-11 rounded-xl w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Sort: Latest visit</SelectItem>
            <SelectItem value="most_repairs">Sort: Most repairs</SelectItem>
            <SelectItem value="name">Sort: Name (A–Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading customers...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{customers.length === 0 ? "No customers yet. Customers are created automatically when you add a repair order." : "No customers match your search."}</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold">Total</th>
                  <th className="text-left px-4 py-3 font-semibold">Pending</th>
                  <th className="text-left px-4 py-3 font-semibold">Spent</th>
                  <th className="text-left px-4 py-3 font-semibold">Last Visit</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => setOpenId(c.id)} className="font-semibold text-primary hover:underline text-left">
                        {c.name || "(unnamed)"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{c.phone}</div>
                      {c.email && <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"><Mail className="w-3 h-3" />{c.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary/10 text-secondary">
                        {c.totalRepairs}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.pendingRepairs > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-warning/10 text-warning">
                          {c.pendingRepairs}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">₹{c.totalSpent.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(c.lastVisit)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => setOpenId(c.id)}>
                          <Eye className="w-3 h-3 mr-1" />View
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="rounded-lg text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove <span className="font-semibold">{c.name}</span>. Their repair orders will be kept but will no longer be linked to a customer profile.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDelete(c.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CustomerDetailsDialog
        customerId={openId}
        onClose={() => setOpenId(null)}
        onChanged={refresh}
      />
    </div>
  );
};

export default CustomersSection;
