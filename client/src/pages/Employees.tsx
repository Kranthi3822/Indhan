import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Plus, UserCheck, Clock, IndianRupee } from "lucide-react";

const ROLES = ["Pump Attendant", "Shift Incharge", "Accountant", "Manager", "Security", "Maintenance"];

const mockEmployees = [
  { id: 1, name: "Ravi Kumar", role: "Shift Incharge", phone: "9876543210", salary: 18000, status: "active", joinDate: "2022-04-01" },
  { id: 2, name: "Suresh Babu", role: "Pump Attendant", phone: "9876543211", salary: 12000, status: "active", joinDate: "2023-01-15" },
  { id: 3, name: "Lakshmi Devi", role: "Accountant", phone: "9876543212", salary: 22000, status: "active", joinDate: "2021-08-01" },
  { id: 4, name: "Venkat Rao", role: "Pump Attendant", phone: "9876543213", salary: 12000, status: "active", joinDate: "2023-06-01" },
  { id: 5, name: "Prasad", role: "Security", phone: "9876543214", salary: 10000, status: "active", joinDate: "2022-11-01" },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function Employees() {
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Pump Attendant", phone: "", salary: "", joinDate: "" });

  const totalPayroll = mockEmployees.reduce((s, e) => s + e.salary, 0);
  const activeCount = mockEmployees.filter(e => e.status === "active").length;

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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
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
              <Button className="w-full" onClick={() => { toast.success("Employee added"); setAddOpen(false); }}>
                Add Employee
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50"><CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center mb-3"><Users className="w-4 h-4 text-primary" /></div>
          <p className="text-2xl font-bold tabular-nums">{activeCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Active Employees</p>
        </CardContent></Card>
        <Card className="bg-card border-border/50"><CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg border border-green-500/20 bg-green-500/10 flex items-center justify-center mb-3"><IndianRupee className="w-4 h-4 text-green-400" /></div>
          <p className="text-2xl font-bold tabular-nums">{fmt(totalPayroll)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Monthly Payroll</p>
        </CardContent></Card>
        <Card className="bg-card border-border/50"><CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center justify-center mb-3"><Clock className="w-4 h-4 text-amber-400" /></div>
          <p className="text-2xl font-bold tabular-nums">3</p>
          <p className="text-xs text-muted-foreground mt-0.5">Shifts / Day</p>
        </CardContent></Card>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5"><CardTitle className="text-sm font-semibold flex items-center gap-2"><UserCheck className="w-4 h-4 text-primary" /> Staff Directory</CardTitle></CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="space-y-3">
            {mockEmployees.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
                    {e.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.role} - Joined {e.joinDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{fmt(e.salary)}</p>
                    <p className="text-[10px] text-muted-foreground">per month</p>
                  </div>
                  <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[10px]">Active</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
