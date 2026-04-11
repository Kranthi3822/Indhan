import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, IndianRupee, TrendingDown, CreditCard, Phone, Mail } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function AgingBadge({ days }: { days: number }) {
  if (days <= 30) return <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[10px]">Current</Badge>;
  if (days <= 60) return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px]">30-60 days</Badge>;
  if (days <= 90) return <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/20 text-[10px]">60-90 days</Badge>;
  return <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-[10px]">&gt;90 days</Badge>;
}

export default function Customers() {
  const [addOpen, setAddOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [form, setForm] = useState({ name: "", contactPerson: "", phone: "", email: "", creditLimit: "", paymentTermsDays: "30" });
  const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "cash", reference: "", notes: "" });

  const { data: customers, refetch } = trpc.customers.list.useQuery();
  const { data: receivables } = trpc.customers.receivables.useQuery();

  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => { toast.success("Customer added"); setAddOpen(false); refetch(); setForm({ name: "", contactPerson: "", phone: "", email: "", creditLimit: "", paymentTermsDays: "30" }); },
    onError: (e) => toast.error(e.message),
  });

  const recordPayment = trpc.customers.recordPayment.useMutation({
    onSuccess: () => { toast.success("Payment recorded"); setPayOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const totalOutstanding = customers?.reduce((s: number, c: any) => s + Number(c.outstandingBalance ?? 0), 0) ?? 0;
  const totalCreditLimit = customers?.reduce((s: number, c: any) => s + Number(c.creditLimit ?? 0), 0) ?? 0;
  const utilizationPct = totalCreditLimit > 0 ? ((totalOutstanding / totalCreditLimit) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers & Credit</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Credit limits, outstanding balances, and payment tracking</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border/50">
            <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input placeholder="e.g. Laxmi Infratech" className="bg-secondary border-border/50" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input placeholder="Name" className="bg-secondary border-border/50" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="+91 XXXXX XXXXX" className="bg-secondary border-border/50" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Credit Limit (₹)</Label>
                  <Input placeholder="0" className="bg-secondary border-border/50" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms (days)</Label>
                  <Input placeholder="30" className="bg-secondary border-border/50" value={form.paymentTermsDays} onChange={e => setForm(f => ({ ...f, paymentTermsDays: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={() => {
                if (!form.name) { toast.error("Customer name required"); return; }
                createCustomer.mutate({
                  name: form.name,
                  contactPerson: form.contactPerson || undefined,
                  phone: form.phone || undefined,
                  email: form.email || undefined,
                  creditLimit: parseFloat(form.creditLimit || "0"),
                  paymentTermsDays: parseInt(form.paymentTermsDays || "30"),
                });
              }} disabled={createCustomer.isPending}>
                {createCustomer.isPending ? "Adding..." : "Add Customer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="w-9 h-9 rounded-lg border border-red-500/20 bg-red-500/10 flex items-center justify-center mb-3">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmt(totalOutstanding)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Outstanding</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="w-9 h-9 rounded-lg border border-blue-500/20 bg-blue-500/10 flex items-center justify-center mb-3">
              <CreditCard className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmt(totalCreditLimit)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Credit Limit</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="w-9 h-9 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center justify-center mb-3">
              <IndianRupee className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{utilizationPct}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Credit Utilization</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Customer Accounts
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {customers && customers.length > 0 ? (
            <div className="space-y-3">
              {customers.map((c: any) => {
                const outstanding = Number(c.outstandingBalance ?? 0);
                const limit = Number(c.creditLimit ?? 0);
                const utilPct = limit > 0 ? Math.min(100, (outstanding / limit) * 100) : 0;
                return (
                  <div key={c.id} className="p-4 rounded-xl border border-border/40 bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{c.name}</h4>
                          {c.isActive ? (
                            <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[10px]">Active</Badge>
                          ) : (
                            <Badge className="bg-secondary text-muted-foreground text-[10px]">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {c.contactPerson && <span className="text-xs text-muted-foreground">{c.contactPerson}</span>}
                          {c.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold tabular-nums ${outstanding > 0 ? "text-red-400" : "text-green-400"}`}>{fmt(outstanding)}</p>
                        <p className="text-[10px] text-muted-foreground">Outstanding</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Credit limit: {fmt(limit)}</span>
                        <span>{utilPct.toFixed(0)}% used</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${utilPct > 80 ? "bg-red-500" : utilPct > 60 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${utilPct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">Terms: {c.paymentTermsDays ?? 30} days</span>
                      {outstanding > 0 && (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10" onClick={() => { setSelectedCustomer(c); setPayOpen(true); }}>
                          Record Payment
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No customers yet. Add your first customer.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Record Payment — {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-secondary/50 border border-border/40">
              <p className="text-xs text-muted-foreground">Outstanding Balance</p>
              <p className="text-xl font-bold text-red-400 tabular-nums">{fmt(Number(selectedCustomer?.outstandingBalance ?? 0))}</p>
            </div>
            <div className="space-y-2">
              <Label>Amount Received (₹) *</Label>
              <Input placeholder="0.00" className="bg-secondary border-border/50 text-lg font-semibold" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Reference / Cheque No.</Label>
              <Input placeholder="e.g. NEFT/RTGS reference" className="bg-secondary border-border/50" value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={() => {
              if (!payForm.amount || !selectedCustomer) { toast.error("Enter amount"); return; }
              recordPayment.mutate({
                customerId: selectedCustomer.id,
                amount: parseFloat(payForm.amount),
                paymentDate: new Date().toISOString().split("T")[0],
                paymentMethod: payForm.reference ? "bank" : "cash",
                referenceNo: payForm.reference || undefined,
                notes: payForm.notes || undefined,
              });
            }} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
