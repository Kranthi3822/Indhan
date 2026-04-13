import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin, Calendar, Fuel, Award, FileText, Shield,
  Beaker, Truck, Zap, Info, Phone, Mail, IndianRupee
} from "lucide-react";

// Simulated badge — shown next to any data that is placeholder/simulated
function SimBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 ml-1.5 align-middle">
      <Info className="w-2.5 h-2.5" /> sim
    </span>
  );
}

const LICENSES = [
  { label: "Petroleum License",   value: "PL/TS/NZB/2020/04821",   icon: Fuel },
  { label: "PESO Registration",   value: "PESO/TS/2020/NZB/1147",  icon: Shield },
  { label: "GST Number",          value: "36AABFB2847R1ZQ",         icon: FileText },
  { label: "Trade License",       value: "TL/NZB/VLG/2020/0093",   icon: Award },
  { label: "Pollution NOC",       value: "TSPCB/NOC/2020/NZB/512", icon: Beaker },
  { label: "Weights & Measures",  value: "WM/TS/NZB/2020/0338",    icon: Shield },
];

// Real employees from payroll data (wages expenses table)
// Role inferred from avg monthly salary band
const TEAM = [
  // Management — real, not simulated
  { name: "Rajeev Kumar",   role: "Owner & Director",          initials: "RK", color: "bg-teal-500/15 text-teal-400 border-teal-500/20",   sim: false, avgSalary: null },
  { name: "Kranthi",        role: "Operations & Finance",      initials: "KR", color: "bg-blue-500/15 text-blue-400 border-blue-500/20",      sim: false, avgSalary: null },
  // Staff — real names from payroll, roles inferred (sim badge on role only)
  { name: "Mahesh",         role: "Station In-charge",         initials: "MA", color: "bg-green-500/15 text-green-400 border-green-500/20",   sim: false, avgSalary: 16643 },
  { name: "Narayana",       role: "Senior Pump Operator",      initials: "NA", color: "bg-purple-500/15 text-purple-400 border-purple-500/20", sim: false, avgSalary: 5189 },
  { name: "Kiran",          role: "Pump Operator",             initials: "KI", color: "bg-sky-500/15 text-sky-400 border-sky-500/20",         sim: false, avgSalary: 4256 },
  { name: "Ashok",          role: "Pump Operator",             initials: "AS", color: "bg-orange-500/15 text-orange-400 border-orange-500/20", sim: false, avgSalary: 7862 },
  { name: "Anjaiah",        role: "Pump Operator",             initials: "AN", color: "bg-pink-500/15 text-pink-400 border-pink-500/20",      sim: false, avgSalary: 10200 },
  { name: "Santhosh",       role: "Pump Operator",             initials: "SA", color: "bg-teal-500/15 text-teal-400 border-teal-500/20",      sim: false, avgSalary: 8783 },
  { name: "Suresh",         role: "Maintenance",               initials: "SU", color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20", sim: false, avgSalary: 5313 },
  { name: "Parandhamulu",   role: "Helper / Sweeper",          initials: "PA", color: "bg-rose-500/15 text-rose-400 border-rose-500/20",      sim: false, avgSalary: 5375 },
  { name: "Phanindhra",     role: "Pump Operator",             initials: "PH", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",      sim: false, avgSalary: 6500 },
];

const PRODUCTS = [
  { name: "Petrol (MS)",  grade: "Regular",       icon: Fuel,   color: "text-teal-400" },
  { name: "Diesel (HSD)", grade: "Regular",        icon: Truck,  color: "text-blue-400"  },
  { name: "Lubricants",   grade: "Castrol / IOC",  icon: Beaker, color: "text-green-400" },
  { name: "EV Charging",  grade: "Coming Soon",    icon: Zap,    color: "text-purple-400" },
];

const fmtK = (n: number) => n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`;

export default function About() {
  return (
    <div className="space-y-4 max-w-4xl">
      {/* Station Hero */}
      <Card className="bg-card border-border/50 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-teal-700 via-teal-500 to-teal-400" />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/20 shrink-0">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663403005351/5eGjBPBASNJYbjmGqsiMsX/indhan-logo-6ekMaVrYfXxqGE4arLFfFC.webp"
                alt="Indhan"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold leading-tight">Bhagya Lakshmi Eco Energy Station</h1>
              <p className="text-sm text-primary font-medium mt-0.5">Indian Oil Corporation — Authorised Dealer</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Velgatoor, Nizamabad District, Telangana — 503 175</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Est. 2020</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  <span>+91 94400 XXXXX<SimBadge /></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  <span>bees@indhan.in<SimBadge /></span>
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col gap-5 sm:gap-3 shrink-0 text-center">
              <div>
                <p className="text-xl font-bold text-primary tabular-nums">5+</p>
                <p className="text-[10px] text-muted-foreground">Years</p>
              </div>
              <div>
                <p className="text-xl font-bold text-teal-400 tabular-nums">4</p>
                <p className="text-[10px] text-muted-foreground">Nozzles</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-400 tabular-nums">{TEAM.length}</p>
                <p className="text-[10px] text-muted-foreground">Staff</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Products & Services</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRODUCTS.map(p => {
            const Icon = p.icon;
            return (
              <Card key={p.name} className="bg-card border-border/50">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${p.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.grade}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Licenses */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Licenses & Registrations</p>
          <span className="text-[10px] text-teal-400 flex items-center gap-1">
            <Info className="w-3 h-3" /> Numbers are simulated
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LICENSES.map(lic => {
            const Icon = lic.icon;
            return (
              <Card key={lic.label} className="bg-card border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">{lic.label}</p>
                    <p className="text-xs font-mono font-semibold truncate">
                      {lic.value}<SimBadge />
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Team — real names from payroll */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team</p>
          <span className="text-[10px] text-teal-400 flex items-center gap-1">
            <Info className="w-3 h-3" /> Names from wages records · Roles inferred<SimBadge />
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {TEAM.map(member => (
            <Card key={member.name} className="bg-card border-border/50">
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm ${member.color}`}>
                  {member.initials}
                </div>
                <div>
                  <p className="text-xs font-semibold">{member.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {member.role}
                    {member.sim && <SimBadge />}
                  </p>
                  {member.avgSalary && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <IndianRupee className="w-2.5 h-2.5 text-muted-foreground/50" />
                      <span className="text-[10px] text-muted-foreground tabular-nums">{fmtK(member.avgSalary)}/mo</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Platform footer */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663403005351/5eGjBPBASNJYbjmGqsiMsX/indhan-logo-6ekMaVrYfXxqGE4arLFfFC.webp"
              alt="Indhan"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-bold text-primary">इंधन — Indhan Platform</p>
            <p className="text-xs text-muted-foreground mt-0.5">Fuel Station Operations & Intelligence · Powered by ServCrust</p>
            <p className="text-[10px] text-muted-foreground mt-1">Data: Apr 2025 – Mar 2026 · v1.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
