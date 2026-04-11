import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Receipt, Plus, CheckCircle, Clock, XCircle, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const EXPENSE_CATEGORIES = ["Wages", "Admin", "Electricity", "Hospitality", "Maintenance", "Performance Bonus"];

const categoryColors: Record<string, string> = {
  "Wages": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Admin": "text-purple-400 bg-purple-500/10 border-purple-500/20",
  "Electricity": "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  "Hospitality": "text-pink-400 bg-pink-500/10 border-pink-500/20",
  "Maintenance": "text-orange-400 bg-orange-500/10 border-orange-500/20",
  "Performance Bonus": "text-green-400 bg-green-500/10 border-green-500/20",
};

export default function Expenses() {
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    expenseDate: format(new Date(), "yyyy-MM-dd"),
    category: "Wages",
    description: "",
    amount: "",
    paymentMethod: "cash",
    paidTo: "",
    billNo: "",
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");

  const { data: expenses, refetch } = trpc.expenses.list.useQuery({ startDate: monthStart, endDate: today });
  const { data: summary } = trpc.expenses.summary.useQuery({ startDate: monthStart, endDate: today });

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => { toast.success("Expense recorded"); setAddOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const approveExpense = trpc.expenses.approve.useMutation({
    onSuccess: () => { toast.success("Expense approved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const totalExpenses = expenses?.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0) ?? 0;
  const pendingCount = expenses?.filter((e: any) => e.approvalStatus === "pending").length ?? 0;

  const chartData = summary?.map((s: any) => ({
    category: s.category?.split(" ")[0] ?? s.category,
    amount: Number(s.totalAmount ?? 0),
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Expenses</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Category-wise expense tracking with approval workflow</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Expense</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border/50">
            <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" className="bg-secondary border-border/50" value={form.expenseDate} onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select defaultValue="Wages" onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="bg-secondary border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Description *</Label>
                  <Input placeholder="What was this expense for?" className="bg-secondary border-border/50" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input placeholder="0.00" className="bg-secondary border-border/50 text-lg font-semibold" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Paid To</Label>
                  <Input placeholder="Vendor / Person" className="bg-secondary border-border/50" value={form.paidTo} onChange={e => setForm(f => ({ ...f, paidTo: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select defaultValue="cash" onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                    <SelectTrigger className="bg-secondary border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bill / Reference No.</Label>
                  <Input placeholder="Optional" className="bg-secondary border-border/50" value={form.billNo} onChange={e => setForm(f => ({ ...f, billNo: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={() => {
                if (!form.description || !form.amount) { toast.error("Fill required fields"); return; }
                createExpense.mutate({
                  expenseDate: form.expenseDate,
                  headAccount: "Operating Activities",
                  subHeadAccount: form.category as any,
                  description: form.description,
                  amount: parseFloat(form.amount),
                  modeOfPayment: form.paymentMethod === "cash" ? "Cash" : form.paymentMethod === "upi" ? "Online" : "Bank",
                  paidBy: form.paidTo || undefined,
                });
              }} disabled={createExpense.isPending}>
                {createExpense.isPending ? "Recording..." : "Record Expense"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="w-9 h-9 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center mb-3">
              <Receipt className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmt(totalExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total This Month</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="w-9 h-9 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center justify-center mb-3">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{pendingCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pending Approval</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="w-9 h-9 rounded-lg border border-green-500/20 bg-green-500/10 flex items-center justify-center mb-3">
              <BarChart3 className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{summary?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Active Categories</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Expense by Category (This Month)</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.016 240)" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: "oklch(0.60 0.012 240)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.012 240)" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "oklch(0.17 0.014 240)", border: "1px solid oklch(0.26 0.016 240)", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="amount" fill="oklch(0.78 0.15 65)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold">Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {expenses && expenses.length > 0 ? (
            <div className="space-y-2">
              {expenses.slice(0, 20).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge className={`text-[10px] ${categoryColors[e.category] ?? "text-muted-foreground bg-secondary"}`}>
                      {e.category}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{e.description}</p>
                      <p className="text-xs text-muted-foreground">{e.expenseDate}{e.paidTo ? ` · ${e.paidTo}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold tabular-nums">{fmt(Number(e.amount ?? 0))}</p>
                    {e.approvalStatus === "approved" ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : e.approvalStatus === "rejected" ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => approveExpense.mutate({ id: e.id, status: "approved", approvedBy: "Owner" })}>
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No expenses recorded this month</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
