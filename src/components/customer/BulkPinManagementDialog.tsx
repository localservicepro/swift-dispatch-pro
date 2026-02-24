import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Key, Send, RefreshCw, CheckCircle2, XCircle, AlertCircle, Mail, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company_name: string | null;
  business_name: string | null;
  pin_enabled: boolean | null;
  portal_access_enabled: boolean | null;
  pin_expires_at: string | null;
}

interface BulkPinManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ProcessingState = "idle" | "loading" | "processing" | "done";

interface Results {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  failures: { customer_id: string; name: string; error: string }[];
}

export function BulkPinManagementDialog({ open, onOpenChange }: BulkPinManagementDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [state, setState] = useState<ProcessingState>("idle");
  const [results, setResults] = useState<Results | null>(null);
  const [sendEmails, setSendEmails] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCustomers = customers.filter(c => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(s) ||
      c.business_name?.toLowerCase().includes(s) ||
      c.first_name?.toLowerCase().includes(s) ||
      c.last_name?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase().includes(s)
    );
  });

  const withPins = customers.filter(c => c.pin_enabled);
  const withoutPins = customers.filter(c => !c.pin_enabled);

  useEffect(() => {
    if (open) {
      loadCustomers();
      setResults(null);
      setSelectedIds(new Set());
      setState("idle");
    }
  }, [open]);

  const loadCustomers = async () => {
    setState("loading");
    const { data, error } = await supabase
      .from("customers")
      .select("id, first_name, last_name, email, company_name, business_name, pin_enabled, portal_access_enabled, pin_expires_at")
      .eq("customer_type", "account")
      .eq("is_active", true)
      .order("company_name", { ascending: true });

    if (error) {
      toast({ title: "Error", description: "Failed to load customers", variant: "destructive" });
      setState("idle");
      return;
    }
    setCustomers(data || []);
    setState("idle");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const filteredIds = filteredCustomers.map(c => c.id);
    const allSelected = filteredIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => new Set([...prev, ...filteredIds]));
    }
  };

  const selectWithoutPins = () => {
    setSelectedIds(new Set(withoutPins.map(c => c.id)));
  };

  const runBulk = async (mode: "all_without_pins" | "selected") => {
    setState("processing");
    setResults(null);

    try {
      const body: Record<string, unknown> = { send_emails: sendEmails };
      if (mode === "all_without_pins") {
        body.all_without_pins = true;
      } else {
        body.customer_ids = Array.from(selectedIds);
      }

      const { data, error } = await supabase.functions.invoke("bulk-generate-portal-pins", { body });

      if (error) throw error;
      setResults(data as Results);
      toast({
        title: "Bulk PIN Generation Complete",
        description: `${(data as Results).success} PINs generated successfully`,
      });
      // Refresh customer list
      await loadCustomers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate PINs", variant: "destructive" });
    } finally {
      setState("done");
    }
  };

  const togglePortalAccess = async (customerId: string, enabled: boolean) => {
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? { ...c, portal_access_enabled: enabled } : c
    ));

    const { error } = await supabase
      .from('customers')
      .update({ portal_access_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('id', customerId);

    if (error) {
      setCustomers(prev => prev.map(c =>
        c.id === customerId ? { ...c, portal_access_enabled: !enabled } : c
      ));
      toast({ title: "Error", description: "Failed to update portal access", variant: "destructive" });
    }
  };

  const customerName = (c: Customer) =>
    c.company_name || c.business_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown";

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Bulk PIN Management
          </DialogTitle>
          <DialogDescription>
            Generate and send portal access PINs to account customers
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold">{customers.length}</p>
            <p className="text-xs text-muted-foreground">Account Customers</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{withPins.length}</p>
            <p className="text-xs text-muted-foreground">Have PINs</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{withoutPins.length}</p>
            <p className="text-xs text-muted-foreground">Need PINs</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => runBulk("all_without_pins")}
            disabled={state === "processing" || withoutPins.length === 0}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Generate All Missing ({withoutPins.length})
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runBulk("selected")}
            disabled={state === "processing" || selectedIds.size === 0}
          >
            <Send className="h-4 w-4 mr-1" />
            Send to Selected ({selectedIds.size})
          </Button>
          <Button size="sm" variant="ghost" onClick={selectWithoutPins} disabled={state === "processing"}>
            Select Without PINs
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Checkbox
              id="send-emails"
              checked={sendEmails}
              onCheckedChange={(v) => setSendEmails(!!v)}
            />
            <label htmlFor="send-emails" className="text-sm flex items-center gap-1 cursor-pointer">
              <Mail className="h-3.5 w-3.5" /> Send emails
            </label>
          </div>
        </div>

        {/* Processing indicator */}
        {state === "processing" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Processing customers...</p>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="rounded-lg border p-3 space-y-2">
            <p className="font-medium text-sm">Results</p>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" /> {results.success} generated
              </span>
              {results.failed > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-4 w-4" /> {results.failed} failed
                </span>
              )}
              {results.skipped > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" /> {results.skipped} skipped
                </span>
              )}
            </div>
            {results.failures.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1 mt-1">
                {results.failures.map((f, i) => (
                  <p key={i}>{f.name}: {f.error}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Customer table */}
        <div className="max-h-[400px] overflow-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>PIN Status</TableHead>
                <TableHead>Portal Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state === "loading" ? (
                <TableRow>
                   <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading customers...
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No customers match your search" : "No account customers found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={() => toggleSelect(c.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{customerName(c)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.email || <span className="text-destructive">No email</span>}
                    </TableCell>
                    <TableCell>
                      {c.pin_enabled ? (
                        isExpired(c.pin_expires_at) ? (
                          <Badge variant="destructive" className="text-xs">Expired</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Active</Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-xs">No PIN</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={!!c.portal_access_enabled}
                        onCheckedChange={(checked) => togglePortalAccess(c.id, checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
