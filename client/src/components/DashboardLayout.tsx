import { useAuth } from "@/_core/hooks/useAuth";
import { STATION_SHORT_NAME, STATION_ADDRESS } from "@shared/const";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { useInventoryNotifications } from "@/hooks/useInventoryNotifications";
import { toast } from "sonner";
import {
  LayoutDashboard, RefreshCw, Users, Package, Receipt,
  Landmark, TrendingUp, FileUp, Settings, LogOut,
  PanelLeft, Fuel, UserCheck, ChevronRight, Bell, Sun, Moon, Info,
  Wrench, IndianRupee, ScanFace, Gauge, Tag, ScanLine, Banknote, ClipboardList, Upload, FlaskConical, UserCog, ClipboardCheck,
  Truck, ShieldCheck, TestTube,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import SathiAgent from "./SathiAgent";
import { useTheme } from "../contexts/ThemeContext";

// Role type
type UserRole = "admin" | "owner" | "accountant" | "incharge" | "pump_attendant" | "user";

// Access matrix — which roles can see each menu item
// admin/owner/accountant = identical full access
// incharge = operational + customers/expenses + assets only
// pump_attendant = nozzle entry only
const ALL_ROLES: UserRole[] = ["admin", "owner", "accountant", "incharge", "pump_attendant", "user"];
const ADMIN_ACCOUNTANT: UserRole[] = ["admin", "owner", "accountant"];
const ADMIN_INCHARGE: UserRole[] = ["admin", "owner", "accountant", "incharge"];
const ADMIN_ONLY: UserRole[] = ["admin", "owner"];

const menuItems = [
  // OPERATIONS
  { icon: LayoutDashboard, label: "Dashboard",       path: "/",               group: "Operations", roles: ADMIN_ACCOUNTANT },
  { icon: Gauge,           label: "Nozzle Entry",    path: "/nozzle-entry",   group: "Operations", roles: ALL_ROLES },
  { icon: Fuel,            label: "Sales & Nozzles", path: "/sales",          group: "Operations", roles: ADMIN_INCHARGE },
  { icon: RefreshCw,       label: "Reconciliation",  path: "/reconciliation", group: "Operations", roles: ADMIN_ACCOUNTANT },
  { icon: Banknote,        label: "Cash Handover",   path: "/cash-handover",  group: "Operations", roles: ADMIN_INCHARGE },
  { icon: ShieldCheck,     label: "Meter Approval",   path: "/meter-approval",  group: "Operations", roles: ADMIN_INCHARGE },
  // FUEL MANAGEMENT
  { icon: Tag,             label: "Fuel Prices",         path: "/fuel-prices",      group: "Fuel", roles: ADMIN_INCHARGE },
  { icon: ScanLine,        label: "Receipt Scanner",     path: "/receipt-scanner",  group: "Fuel", roles: ADMIN_ACCOUNTANT },
  { icon: Package,         label: "Inventory",           path: "/inventory",        group: "Fuel", roles: ADMIN_INCHARGE },
  { icon: FlaskConical,    label: "Daily Stock Register",path: "/daily-stock",      group: "Fuel", roles: ADMIN_INCHARGE },
  { icon: Truck,           label: "Fuel Delivery & QC",  path: "/fuel-delivery",   group: "Fuel", roles: ADMIN_INCHARGE },
  { icon: TestTube,        label: "E70 Testing",          path: "/e70-testing",     group: "Fuel", roles: ADMIN_INCHARGE },
  // FINANCE
  { icon: Users,           label: "Customers & Credit",  path: "/customers",              group: "Finance", roles: ADMIN_INCHARGE },
  { icon: Receipt,         label: "Expenses",            path: "/expenses",               group: "Finance", roles: ADMIN_INCHARGE },
  { icon: Landmark,        label: "Bank Statement",      path: "/bank",                   group: "Finance", roles: ADMIN_ACCOUNTANT },
  { icon: Upload,          label: "Bank Sync",           path: "/bank-statement-upload",  group: "Finance", roles: ADMIN_ACCOUNTANT },
  { icon: TrendingUp,      label: "P&L Reports",         path: "/reports",                group: "Finance", roles: ADMIN_ACCOUNTANT },
  // PEOPLE
  { icon: UserCheck,       label: "Employees",           path: "/employees",  group: "People", roles: ADMIN_INCHARGE },
  { icon: IndianRupee,     label: "Payroll",             path: "/payroll",    group: "People", roles: ADMIN_ACCOUNTANT },
  { icon: ScanFace,        label: "Attendance",          path: "/attendance", group: "People", roles: ADMIN_INCHARGE },
  // SETUP
  { icon: Wrench,          label: "Assets & Equipment",  path: "/assets",    group: "Setup", roles: ADMIN_INCHARGE },
  { icon: FileUp,          label: "Import Data",         path: "/import",    group: "Setup", roles: ADMIN_ONLY },
  { icon: Settings,        label: "Settings",            path: "/settings",  group: "Setup", roles: ADMIN_ONLY },
  { icon: UserCog,         label: "User Management",     path: "/users",       group: "Setup", roles: ADMIN_ONLY },
  { icon: ClipboardCheck,  label: "Audit Log",           path: "/audit-log",   group: "Setup", roles: ADMIN_ACCOUNTANT },
  { icon: Info,            label: "About",               path: "/about",       group: "Setup", roles: ALL_ROLES },
];

// Bottom nav shows the 5 most-used items on mobile
const BOTTOM_NAV = [
  { icon: LayoutDashboard, label: "Home",    path: "/" },
  { icon: Gauge,           label: "Nozzle",  path: "/nozzle-entry" },
  { icon: RefreshCw,       label: "Recon",   path: "/reconciliation" },
  { icon: FlaskConical,    label: "Stock",   path: "/daily-stock" },
  { icon: Banknote,        label: "Cash",    path: "/cash-handover" },
];

const groups = ["Operations", "Fuel", "Finance", "People", "Setup"];
const SIDEBAR_WIDTH_KEY = "indhan-sidebar-width";
const DEFAULT_WIDTH = 248;
const MIN_WIDTH = 200;
const MAX_WIDTH = 320;

function NotificationBell() {
  const { requestPermission } = useInventoryNotifications();
  const [perm, setPerm] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const handleClick = async () => {
    if (perm === "granted") {
      toast.success("Notifications already enabled", {
        description: "You'll be alerted when stock drops below minimum levels.",
        duration: 3000,
      });
      return;
    }
    await requestPermission();
    const newPerm = typeof Notification !== "undefined" ? Notification.permission : "default";
    setPerm(newPerm);
    if (newPerm === "granted") {
      toast.success("Push notifications enabled", {
        description: "You'll receive alerts when products drop below reorder levels.",
        duration: 4000,
      });
    } else if (newPerm === "denied") {
      toast.error("Notifications blocked", {
        description: "Allow notifications in your browser settings to receive low-stock alerts.",
        duration: 5000,
      });
    } else {
      toast("Notification permission dismissed", {
        description: "Tap the bell again to enable low-stock alerts.",
        duration: 3000,
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      title={perm === "granted" ? "Notifications enabled" : "Enable low-stock notifications"}
      className="h-9 w-9 rounded-lg hover:bg-secondary/60 flex items-center justify-center relative"
    >
      <Bell className={`h-4 w-4 ${perm === "granted" ? "text-primary" : "text-muted-foreground"}`} />
      {perm !== "granted" && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
      )}
    </button>
  );
}

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="h-9 w-9 rounded-lg hover:bg-secondary/60 flex items-center justify-center transition-colors"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
      ) : (
        <Moon className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
      )}
    </button>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  // Detect auth_error query param set by the OAuth callback on failure
  const [authError, setAuthError] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('auth_error');
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Remove the error param from the URL without reloading
  useEffect(() => {
    if (!authError) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('auth_error');
    window.history.replaceState({}, '', url.toString());
  }, [authError]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    const errorMessage = authError === 'expired'
      ? 'Your login session expired — please try again.'
      : authError
      ? 'Sign-in failed — please try again.'
      : null;
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-sm w-full">
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border border-primary/20">
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663403005351/5eGjBPBASNJYbjmGqsiMsX/indhan-logo-6ekMaVrYfXxqGE4arLFfFC.webp" alt="Indhan" className="w-full h-full object-cover" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-primary tracking-tight">इंधन</h1>
              <p className="text-sm text-muted-foreground mt-1">Fuel Station Operations Platform</p>
            </div>
          </div>
          {errorMessage ? (
            <div className="w-full rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-destructive">{errorMessage}</p>
              <p className="text-xs text-muted-foreground mt-1">Tap the button below to sign in again.</p>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Welcome back</h2>
              <p className="text-sm text-muted-foreground">Sign in to manage your fuel station</p>
            </div>
          )}
          <Button
            onClick={() => { setAuthError(null); window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full font-semibold h-12 text-base"
          >
            {errorMessage ? 'Try Sign In Again' : 'Sign in to Indhan'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (w: number) => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => { if (isCollapsed) setIsResizing(false); }, [isCollapsed]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const w = e.clientX - left;
      if (w >= MIN_WIDTH && w <= MAX_WIDTH) setSidebarWidth(w);
    };
    const onUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  // Close sidebar on mobile when navigating
  const { setOpen } = useSidebar();
  const handleNavigate = (path: string) => {
    setLocation(path);
    if (isMobile) setOpen(false);
  };

  const userRole = (user?.role ?? "user") as UserRole;
  const visibleMenuItems = menuItems.filter(i => i.roles.includes(userRole));
  const activeItem = visibleMenuItems.find(i => i.path === location) ?? menuItems.find(i => i.path === location);

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <div className="relative hidden md:block" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-border/50" disableTransition={isResizing}>
          <SidebarHeader className="h-14 border-b border-border/50">
            <div className="flex items-center gap-2.5 px-2.5 h-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent/50 rounded-lg transition-colors shrink-0"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
                    <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663403005351/5eGjBPBASNJYbjmGqsiMsX/indhan-logo-6ekMaVrYfXxqGE4arLFfFC.webp" alt="Indhan" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-primary tracking-tight">इंधन</div>
                    <div className="text-[10px] text-muted-foreground leading-none">Fuel Station OS</div>
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-2 gap-0">
            {!isCollapsed && (
              <div className="mx-1 mb-3 px-3 py-2 rounded-lg bg-primary/8 border border-primary/15">
                <p className="text-xs font-bold text-primary truncate">{STATION_SHORT_NAME}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{STATION_ADDRESS}</p>
              </div>
            )}
            {groups.map(group => {
              const items = visibleMenuItems.filter(i => i.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group} className={!isCollapsed ? "mb-2" : "mb-1"}>
                  {!isCollapsed && (
                    <div className="px-3 mb-1">
                      <span className="section-label">{group === "Fuel" ? "Fuel Management" : group}</span>
                    </div>
                  )}
                  <SidebarMenu>
                    {items.map(item => {
                      const isActive = location === item.path;
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => handleNavigate(item.path)}
                            tooltip={isCollapsed ? item.label : undefined}
                            className={`h-8 rounded-lg transition-all duration-150 ${isActive ? 'bg-primary/12 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}
                          >
                            <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                            {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </div>
              );
            })}
          </SidebarContent>

          <SidebarFooter className="border-t border-border/50 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="h-10 rounded-lg hover:bg-secondary/60">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                          {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                      {!isCollapsed && (
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-medium truncate">{user?.name ?? "User"}</span>
                          <span className="text-[10px] text-muted-foreground truncate capitalize">{user?.role ?? "user"}</span>
                        </div>
                      )}
                      {!isCollapsed && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-52">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleNavigate("/settings")}>
                      <Settings className="h-4 w-4 mr-2" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        {!isCollapsed && !isMobile && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-10"
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      {/* ── Mobile drawer sidebar (full-screen overlay) ─────────────────── */}
      <div className="md:hidden">
        <Sidebar collapsible="offcanvas" className="border-r border-border/50 z-50">
          <SidebarHeader className="h-14 border-b border-border/50">
            <div className="flex items-center gap-2.5 px-3 h-full">
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
                <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663403005351/5eGjBPBASNJYbjmGqsiMsX/indhan-logo-6ekMaVrYfXxqGE4arLFfFC.webp" alt="Indhan" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-primary tracking-tight">इंधन</div>
                <div className="text-[10px] text-muted-foreground leading-none truncate">{STATION_SHORT_NAME}</div>
              </div>
              <SidebarTrigger className="h-8 w-8 rounded-lg hover:bg-secondary/60" />
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-2 gap-0">
            {groups.map(group => {
              const items = visibleMenuItems.filter(i => i.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group} className="mb-2">
                  <div className="px-3 mb-1">
                    <span className="section-label">{group === "Fuel" ? "Fuel Management" : group}</span>
                  </div>
                  <SidebarMenu>
                    {items.map(item => {
                      const isActive = location === item.path;
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => handleNavigate(item.path)}
                            className={`h-11 rounded-lg transition-all duration-150 ${isActive ? 'bg-primary/12 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}
                          >
                            <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                            <span className="text-sm truncate">{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </div>
              );
            })}
          </SidebarContent>

          <SidebarFooter className="border-t border-border/50 p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium truncate">{user?.name ?? "User"}</span>
                <span className="text-xs text-muted-foreground truncate capitalize">{user?.role ?? "user"}</span>
              </div>
              <button
                onClick={logout}
                className="h-9 w-9 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>
      </div>

      {/* ── Main content area ────────────────────────────────────────────── */}
      <SidebarInset className="flex flex-col min-h-screen">
        {/* Top header */}
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-3 md:px-5 shrink-0 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-secondary/60 md:hidden" />
            {/* Desktop: show collapse toggle */}
            <button
              onClick={toggleSidebar}
              className="h-9 w-9 rounded-lg hover:bg-secondary/60 hidden md:flex items-center justify-center"
              title="Toggle sidebar"
            >
              <PanelLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-foreground leading-tight">{activeItem?.label ?? "Indhan"}</h1>
              <p className="text-[10px] text-muted-foreground leading-none hidden sm:block">{STATION_SHORT_NAME}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] font-medium border-primary/30 text-primary hidden sm:flex items-center gap-1 px-2 h-6" style={{background: 'oklch(0.78 0.15 65 / 0.08)'}}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </Badge>
            <ThemeToggleButton />
            <NotificationBell />
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile for bottom nav */}
        <main className="flex-1 p-3 md:p-5 overflow-auto pb-20 md:pb-5">{children}</main>
      </SidebarInset>

      {/* ── Mobile bottom navigation bar ────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/50 pb-safe">
        <div className="flex items-stretch h-14">
          {BOTTOM_NAV.map(item => {
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                <span className={`text-[9px] font-medium leading-none ${isActive ? 'text-primary' : ''}`}>{item.label}</span>
                {isActive && <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />}
              </button>
            );
          })}
          {/* "More" button opens full sidebar */}
          <button
            onClick={toggleSidebar}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-[9px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>

      <SathiAgent />
    </>
  );
}
