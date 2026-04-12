import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, Plus, UserCheck, Clock, IndianRupee } from "lucide-react";
import { trpc } from "@/lib/trpc";

const ROLES = ["Pump Attendant", "Shift Incharge", "Accountant", "Manager", "Security", "Maintenance"];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function Employees() {
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Pump Attendant", phone: "", salary: "", joinDate: "" });

  const utils = trpc.useUtils();
  const { data: employees = [], isLoading } = trpc.hr.listEmployees.useQuery({ activeOnly: false });
  const createEmployee = trpc.hr.createEmployee.useMutation({
    onSuccess: () => {
      toast.success("Employee added successfully");
      utils.hr.listEmployees.invalidate();
      setAddOpen(false);
      setForm({ name: "", role: "Pump Attendant", phone: "", salary: "", joinDate: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const activeEmployees = employees.filter((e) => e.isActive);
  const totalPayroll = activeEmployees.reduce((s, e) => s + parseFloat(e.basicSalary ?? "0"), 0);
  const activeCount = activeEmployees.length;

  const handleAddEmployee = () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.joinDate) return toast.error("Join date is required");
    createEmployee.mutate({
      name: form.name.trim(),
      role: form.role,
      department: "Operations",
      joinDate: form.joinDate,
      basicSalary: parseFloat(form.salary) || 0,
      phone: form.phone || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Staff management, attendance tracking, and payroll</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Employee</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border/50">
            <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2 sm:col-span-2">
                  <Label>Full Name *</Label>
                  <Input placeholder="Employee name" className="bg-secondary border-border/50" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select defaultValue="Pump Attendant" onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger className="bg-secondary border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="10-digit number" className="bg-secondary border-border/50" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Salary (Rs)</Label>
                  <Input placeholder="0" className="bg-secondary border-border/50" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Join Date</Label>
                  <Input type="date" className="bg-secondary border-border/50" value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={handleAddEmployee} disabled={createEmployee.isPending}>
                {createEmployee.isPending ? "Adding..." : "Add Employee"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50"><CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center mb-3"><Users className="w-4 h-4 text-primary" /></div>
          <p className="text-2xl font-bold tabular-nums">{isLoading ? "—" : activeCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Active Employees</p>
        </CardContent></Card>
        <Card className="bg-card border-border/50"><CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg border border-green-500/20 bg-green-500/10 flex items-center justify-center mb-3"><IndianRupee className="w-4 h-4 text-green-400" /></div>
          <p className="text-2xl font-bold tabular-nums">{isLoading ? "—" : fmt(totalPayroll)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Monthly Payroll</p>
        </CardContent></Card>
        <Card className="bg-card border-border/50"><CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg border border-teal-500/20 bg-teal-500/10 flex items-center justify-center mb-3"><Clock className="w-4 h-4 text-teal-400" /></div>
          <p className="text-2xl font-bold tabular-nums">3</p>
          <p className="text-xs text-muted-foreground mt-0.5">Shifts / Day</p>
        </CardContent></Card>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5"><CardTitle className="text-sm font-semibold flex items-center gap-2"><UserCheck className="w-4 h-4 text-primary" /> Staff Directory</CardTitle></CardHeader>
        <CardContent className="px-5 pb-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No employees found.</p>
          ) : (
            <div className="space-y-3">
              {employees.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
                      {e.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.role}{e.joinDate ? ` · Joined ${e.joinDate}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{fmt(parseFloat(e.basicSalary ?? "0"))}</p>
                      <p className="text-[10px] text-muted-foreground">per month</p>
                    </div>
                    <Badge className={e.isActive ? "bg-green-500/15 text-green-400 border-green-500/20 text-[10px]" : "bg-muted text-muted-foreground border-border/40 text-[10px]"}>
                      {e.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
