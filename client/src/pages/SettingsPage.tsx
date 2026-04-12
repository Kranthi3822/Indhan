import { useState } from "react";
import { Settings, Fuel, Gauge, Building2, Users, Bell, Shield, ChevronRight, Check, Edit2, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Station Info Section ─────────────────────────────────────────────────────
function StationInfoSection() {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "BEES Fuel Station",
    location: "Velgatoor, Nizamabad District, Telangana",
    owner: "Kranthi Kiran Reddy",
    phone: "",
    gstin: "",
    licenseNo: "",
  });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Station Information</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(!editing)}
            className="text-muted-foreground hover:text-foreground"
          >
            {editing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            <span className="ml-1">{editing ? "Cancel" : "Edit"}</span>
          </Button>
        </div>
        <CardDescription>Basic station details and registration information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Station Name", key: "name" },
            { label: "Owner Name", key: "owner" },
            { label: "Location", key: "location" },
            { label: "Phone", key: "phone", placeholder: "Enter phone number" },
            { label: "GSTIN", key: "gstin", placeholder: "Enter GSTIN" },
            { label: "License No.", key: "licenseNo", placeholder: "Enter license number" },
          ].map(({ label, key, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              {editing ? (
                <Input
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {form[key as keyof typeof form] || <span className="text-muted-foreground italic">Not set</span>}
                </p>
              )}
            </div>
          ))}
        </div>
        {editing && (
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => { setEditing(false); toast.success("Station info updated"); }}>
              <Save className="w-3 h-3 mr-1" /> Save Changes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Fuel Configuration Section ──────────────────────────────────────────────
function FuelConfigSection() {
  const { data: prices } = trpc.fuelPrices.getLatestPrice.useQuery({ fuelType: "petrol" });
  const { data: dieselPrices } = trpc.fuelPrices.getLatestPrice.useQuery({ fuelType: "diesel" });

  const fuelItems = [
    {
      type: "Petrol (MS)",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      retail: prices?.retailPrice ?? "108.83",
      cost: prices?.costPrice ?? "104.88",
      tank: "20,000 L",
    },
    {
      type: "Diesel (HSD)",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      retail: dieselPrices?.retailPrice ?? "97.10",
      cost: dieselPrices?.costPrice ?? "94.61",
      tank: "25,000 L",
    },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Fuel Configuration</CardTitle>
        </div>
        <CardDescription>Current retail prices, cost prices and tank capacities. Update prices via Fuel Prices page.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fuelItems.map(f => (
            <div key={f.type} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${f.bg} flex items-center justify-center`}>
                  <Fuel className={`w-4 h-4 ${f.color}`} />
                </div>
                <span className="font-semibold text-sm">{f.type}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Retail Price</p>
                  <p className="text-sm font-bold text-foreground">₹{f.retail}/L</p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Cost (WACP)</p>
                  <p className="text-sm font-bold text-foreground">₹{f.cost}/L</p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Tank Cap.</p>
                  <p className="text-sm font-bold text-foreground">{f.tank}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          To update prices, go to <strong className="text-primary ml-1">Fuel Prices</strong> in the sidebar.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Nozzle Configuration Section ────────────────────────────────────────────
function NozzleConfigSection() {
  const { data: nozzles } = trpc.nozzle.getNozzles.useQuery();

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Nozzle Configuration</CardTitle>
        </div>
        <CardDescription>Active pumps and nozzle assignments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(nozzles ?? []).map((n: any) => (
            <div key={n.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                n.fuelType === "petrol" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
              }`}>
                {n.id}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{n.label}</p>
                <p className="text-xs text-muted-foreground capitalize">{n.fuelType}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${n.isActive ? "border-emerald-500/30 text-emerald-500" : "border-red-500/30 text-red-500"}`}>
                {n.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── System Preferences Section ──────────────────────────────────────────────
function SystemPreferencesSection() {
  const prefs = [
    { label: "Auto-populate Daily Reports", desc: "Automatically compute daily sales from nozzle sessions on shift close", enabled: true },
    { label: "Reconciliation Alerts", desc: "Show catch-up banner when days are unreconciled", enabled: true },
    { label: "Payroll Notifications", desc: "Notify owner when payroll run is ready for review", enabled: false },
    { label: "Credit Customer Alerts", desc: "Alert when credit customer balance exceeds limit", enabled: true },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">System Preferences</CardTitle>
        </div>
        <CardDescription>Automation and notification settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0">
        {prefs.map((p, i) => (
          <div key={p.label}>
            <div className="flex items-center justify-between py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] ml-4 shrink-0 ${
                p.enabled ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" : "border-border text-muted-foreground"
              }`}>
                {p.enabled ? <><Check className="w-2.5 h-2.5 mr-1" />On</> : "Off"}
              </Badge>
            </div>
            {i < prefs.length - 1 && <Separator />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Access Control Section ───────────────────────────────────────────────────
function AccessControlSection() {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Access Control</CardTitle>
        </div>
        <CardDescription>User roles and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { role: "Admin", desc: "Full access to all modules including payroll, settings, and reports", badge: "bg-primary/10 text-primary border-primary/20" },
            { role: "Manager", desc: "Access to operations, nozzle entry, reconciliation, and staff management", badge: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
            { role: "Attendant", desc: "Access to nozzle entry and daily activity only via Staff Portal", badge: "bg-muted text-muted-foreground border-border" },
          ].map(r => (
            <div key={r.role} className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Badge variant="outline" className={`text-[10px] mt-0.5 shrink-0 ${r.badge}`}>{r.role}</Badge>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          To manage staff accounts, go to <strong className="text-primary ml-1">Employees</strong> in the sidebar.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── App Version Section ──────────────────────────────────────────────────────
function AppVersionSection() {
  return (
    <Card className="border-border">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Indhan — Fuel Station OS</p>
              <p className="text-xs text-muted-foreground">BEES Fuel Station · Velgatoor, Nizamabad</p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
              <Check className="w-2.5 h-2.5 mr-1" />Live
            </Badge>
            <p className="text-[10px] text-muted-foreground mt-1">v1.0.0 · Apr 2026</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Settings</h2>
          <p className="text-sm text-muted-foreground">Station configuration, user roles, and system preferences</p>
        </div>
      </div>

      <AppVersionSection />
      <StationInfoSection />
      <FuelConfigSection />
      <NozzleConfigSection />
      <SystemPreferencesSection />
      <AccessControlSection />
    </div>
  );
}
