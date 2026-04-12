import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, TrendingDown, CreditCard, Phone, IndianRupee, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtCompact = (n: number) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
};

function UtilBar({ pct }: { pct: number }) {
  const color = pct > 80 ? "#ef4444" : pct > 60 ? "#17897e" : "#22c55e";
  return (
    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

const AGING_COLORS = ["#22c55e", "#17897e", "#f97316", "#ef4444"];
const AGING_LABELS = ["≤30d", "31-60d", "61-90d", ">90d"];

export default function Customers() {
  const [addOpen, setAddOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [form, setForm] = useState({ name: "", contactPerson: "", phone: "", email: "", creditLimit: "", paymentTermsDays: "30" });
  const [payForm, setPayForm] = useState({ amount: "", reference: "" });

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
  const utilizationPct = totalCreditLimit > 0 ? (totalOutstanding / totalCreditLimit) * 100 : 0;

  // Build aging buckets for pie chart
  const agingData = useMemo(() => {
    if (!customers) return [];
    const buckets = [0, 0, 0, 0];
    customers.forEach((c: any) => {
      const days = c.paymentTermsDays ?? 30;
      const outstanding = Number(c.outstandingBalance ?? 0);
      if (outstanding <= 0) return;
      if (days <= 30) buckets[0] += outstanding;
      else if (days <= 60) buckets[1] += outstanding;
      else if (days <= 90) buckets[2] += outstanding;
      else buckets[3] += outstanding;
    });
    return AGING_LABELS.map((label, i) => ({ name: label, value: buckets[i], color: AGING_COLORS[i] })).filter(d => d.value > 0);
  }, [customers]);

  // Sort customers by outstanding descending
  const sortedCustomers = useMemo(() =>
    [...(customers ?? [])].sort((a: any, b: any) => Number(b.outstandingBalance ?? 0) - Number(a.outstandingBalance ?? 0)),
    [customers]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{customers?.length ?? 0} accounts</span>
          {totalOutstanding > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-3 h-3 text-red-400" />
              <span className="text-xs font-semibold text-red-400">{fmtCompact(totalOutstanding)} due</span>
            </div>
          )}
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 h-8 text-xs"><Plus className="w-3.5 h-3.5" /> Add</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border/50">
            <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input placeholder="e.g. Laxmi Infratech" className="bg-secondary border-border/50 h-8 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Contact</Label><Input placeholder="Name" className="bg-secondary border-border/50 h-8 text-sm" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input placeholder="+91..." className="bg-secondary border-border/50 h-8 text-sm" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Credit Limit (₹)</Label><Input placeholder="0" className="bg-secondary border-border/50 h-8 text-sm" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Terms (days)</Label><Input placeholder="30" className="bg-secondary border-border/50 h-8 text-sm" value={form.paymentTermsDays} onChange={e => setForm(f => ({ ...f, paymentTermsDays: e.target.value }))} /></div>
              </div>
              <Button className="w-full h-9" onClick={() => {
                if (!form.name) { toast.error("Name required"); return; }
                createCustomer.mutate({ name: form.name, contactPerson: form.contactPerson || undefined, phone: form.phone || undefined, email: form.email || undefined, creditLimit: parseFloat(form.creditLimit || "0"), paymentTermsDays: parseInt(form.paymentTermsDays || "30") });
              }} disabled={createCustomer.isPending}>{createCustomer.isPending ? "Adding..." : "Add Customer"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI strip + Aging donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums leading-tight">{fmtCompact(totalOutstanding)}</p>
                <p className="text-[10px] text-muted-foreground">Outstanding</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums leading-tight">{fmtCompact(totalCreditLimit)}</p>
                <p className="text-[10px] text-muted-foreground">Credit Limit</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                <IndianRupee className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums leading-tight">{utilizationPct.toFixed(0)}%</p>
                <p className="text-[10px] text-muted-foreground">Utilization</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Aging donut */}
        <Card className="bg-card border-border/50 lg:col-span-2">
          <CardContent className="p-4">
            {agingData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={agingData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                      {agingData.map((d, i) => <Cell key={i} fill={d.color} stroke="transparent" />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtCompact(v)} contentStyle={{ background: "oklch(0.17 0.014 240)", border: "1px solid oklch(0.26 0.016 240)", borderRadius: "8px", fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Receivables Aging</p>
                  {agingData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-xs">{d.name}</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums">{fmtCompact(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                <p className="text-sm">No outstanding receivables</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedCustomers.map((c: any) => {
          const outstanding = Number(c.outstandingBalance ?? 0);
          const limit = Number(c.creditLimit ?? 0);
          const utilPct = limit > 0 ? Math.min(100, (outstanding / limit) * 100) : 0;
          const utilColor = utilPct > 80 ? "#ef4444" : utilPct > 60 ? "#17897e" : "#22c55e";
          const initials = c.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

          return (
            <Card key={c.id} className={`bg-card border-border/50 ${outstanding > limit * 0.8 && limit > 0 ? "border-red-500/30" : ""}`}>
              <CardContent className="p-4 space-y-3">
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 font-bold text-sm text-primary">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{c.name}</p>
                    {c.phone && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{c.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold tabular-nums" style={{ color: outstanding > 0 ? "#ef4444" : "#22c55e" }}>
                      {fmtCompact(outstanding)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">due</p>
                  </div>
                </div>

                {/* Credit bar */}
                {limit > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Credit {fmtCompact(limit)}</span>
                      <span style={{ color: utilColor }}>{utilPct.toFixed(0)}%</span>
                    </div>
                    <UtilBar pct={utilPct} />
                  </div>
                )}

                {/* Action */}
                {outstanding > 0 && (
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs border-primary/30 text-primary hover:bg-primary/10" onClick={() => { setSelectedCustomer(c); setPayOpen(true); }}>
                    <IndianRupee className="w-3 h-3 mr-1" /> Collect
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {(!customers || customers.length === 0) && (
          <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Users className="w-12 h-12 opacity-20" />
            <p className="text-sm">No customers yet</p>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}><Plus className="w-3.5 h-3.5 mr-1.5" /> Add first customer</Button>
          </div>
        )}
      </div>

      {/* Payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader><DialogTitle>{selectedCustomer?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Outstanding</span>
              <span className="text-xl font-bold text-red-400 tabular-nums">{fmt(Number(selectedCustomer?.outstandingBalance ?? 0))}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₹)</Label>
              <Input placeholder="0" className="bg-secondary border-border/50 h-9 text-lg font-bold" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reference</Label>
              <Input placeholder="NEFT / Cheque no." className="bg-secondary border-border/50 h-8 text-sm" value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
            <Button className="w-full h-9" onClick={() => {
              if (!payForm.amount || !selectedCustomer) { toast.error("Enter amount"); return; }
              recordPayment.mutate({
                customerId: selectedCustomer.id,
                amount: parseFloat(payForm.amount),
                paymentDate: "2026-03-31",
                paymentMethod: "cash",
                referenceNo: payForm.reference || undefined,
              });
            }} disabled={recordPayment.isPending}>{recordPayment.isPending ? "Recording..." : "Record Payment"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
