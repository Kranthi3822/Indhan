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
import {
  LayoutDashboard, RefreshCw, Users, Package, Receipt,
  Landmark, TrendingUp, FileUp, Settings, LogOut,
  PanelLeft, Fuel, UserCheck, ChevronRight, Bell, Sun, Moon, Info,
  Wrench, IndianRupee, ScanFace, Gauge, Tag, ScanLine, Banknote, ClipboardList, Upload, FlaskConical, Droplets,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import SathiAgent from "./SathiAgent";
import { useTheme } from "../contexts/ThemeContext";

const menuItems = [
  // OPERATIONS
  { icon: LayoutDashboard, label: "Dashboard", path: "/", group: "Operations" },
  { icon: Gauge, label: "Nozzle Entry", path: "/nozzle-entry", group: "Operations" },
  { icon: Fuel, label: "Sales & Nozzles", path: "/sales", group: "Operations" },
  { icon: RefreshCw, label: "Reconciliation", path: "/reconciliation", group: "Operations" },
  { icon: Banknote, label: "Cash Handover", path: "/cash-handover", group: "Operations" },
  { icon: ClipboardList, label: "Daily Activity", path: "/daily-activity", group: "Operations" },
  // FUEL MANAGEMENT
  { icon: Tag, label: "Fuel Prices", path: "/fuel-prices", group: "Fuel" },
  { icon: ScanLine, label: "Receipt Scanner", path: "/receipt-scanner", group: "Fuel" },
  { icon: Package, label: "Inventory", path: "/inventory", group: "Fuel" },
  { icon: FlaskConical, label: "Daily Stock", path: "/daily-stock", group: "Fuel" },
  // FINANCE
  { icon: Users, label: "Customers & Credit", path: "/customers", group: "Finance" },
  { icon: Receipt, label: "Expenses", path: "/expenses", group: "Finance" },
  { icon: Landmark, label: "Bank Statement", path: "/bank", group: "Finance" },
  { icon: Upload, label: "Bank Sync", path: "/bank-statement-upload", group: "Finance" },
  { icon: TrendingUp, label: "P&L Reports", path: "/reports", group: "Finance" },
  // PEOPLE
  { icon: UserCheck, label: "Employees", path: "/employees", group: "People" },
  { icon: IndianRupee, label: "Attendance & Payroll", path: "/payroll", group: "People" },
  { icon: ScanFace, label: "Biometric Attendance", path: "/attendance", group: "People" },
  // SETUP
  { icon: Wrench, label: "Assets & Equipment", path: "/assets", group: "Setup" },
  { icon: FileUp, label: "Import Data", path: "/import", group: "Setup" },
  { icon: Settings, label: "Settings", path: "/settings", group: "Setup" },
  { icon: Info, label: "About Station", path: "/about", group: "Setup" },
];

const groups = ["Operations", "Fuel", "Finance", "People", "Setup"];
const SIDEBAR_WIDTH_KEY = "indhan-sidebar-width";
const DEFAULT_WIDTH = 252;
const MIN_WIDTH = 200;
const MAX_WIDTH = 320;

function NotificationBell() {
  const { requestPermission } = useInventoryNotifications();
  const [perm, setPerm] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const handleClick = async () => {
    if (perm === "granted") return;
    await requestPermission();
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
  };

  return (
    <button
      onClick={handleClick}
      title={perm === "granted" ? "Notifications enabled" : "Enable low-stock notifications"}
      className="h-8 w-8 rounded-lg hover:bg-secondary/60 flex items-center justify-center relative"
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
      className="h-8 w-8 rounded-lg hover:bg-secondary/60 flex items-center justify-center transition-colors"
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

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
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
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to manage your fuel station</p>
          </div>
          <Button onClick={() => { window.location.href = getLoginUrl(); }} size="lg" className="w-full font-semibold">
            Sign in to Indhan
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

  const activeItem = menuItems.find(i => i.path === location);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-border/50" disableTransition={isResizing}>
          <SidebarHeader className="h-16 border-b border-border/50">
            <div className="flex items-center gap-3 px-3 h-full">
              <button onClick={toggleSidebar} className="h-9 w-9 flex items-center justify-center hover:bg-accent/50 rounded-lg transition-colors shrink-0">
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {isCollapsed ? (
                <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
                  <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663403005351/5eGjBPBASNJYbjmGqsiMsX/indhan-logo-6ekMaVrYfXxqGE4arLFfFC.webp" alt="Indhan" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
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

          <SidebarContent className="px-2 py-3 gap-0">
            {!isCollapsed && (
              <div className="mx-2 mb-4 px-3 py-2.5 rounded-lg bg-primary/8 border border-primary/15">
                <p className="text-xs font-bold text-primary truncate">{STATION_SHORT_NAME}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{STATION_ADDRESS}</p>
              </div>
            )}
            {groups.map(group => {
              const items = menuItems.filter(i => i.group === group);
              return (
                <div key={group} className="mb-4">
                  {!isCollapsed && (
                    <div className="px-3 mb-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">{group === "Fuel" ? "Fuel Management" : group}</span>
                    </div>
                  )}
                  <SidebarMenu>
                    {items.map(item => {
                      const isActive = location === item.path;
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => setLocation(item.path)}
                            tooltip={isCollapsed ? item.label : undefined}
                            className={`h-9 rounded-lg transition-all duration-150 ${isActive ? 'bg-primary/12 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}
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
                    <DropdownMenuItem onClick={() => setLocation("/settings")}>
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
          <div className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-10" onMouseDown={() => setIsResizing(true)} />
        )}
      </div>

      <SidebarInset className="flex flex-col min-h-screen">
        <header className="h-14 md:h-16 border-b border-border/50 flex items-center justify-between px-3 md:px-6 shrink-0 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {isMobile && <SidebarTrigger className="h-8 w-8 rounded-lg hover:bg-secondary/60" />}
            <div>
              <h1 className="text-base font-semibold text-foreground">{activeItem?.label ?? "Indhan"}</h1>
              <p className="text-xs text-muted-foreground">{STATION_SHORT_NAME}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary hidden sm:flex" style={{background: 'oklch(0.78 0.15 65 / 0.08)'}}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />
              Live
            </Badge>
            <ThemeToggleButton />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 p-3 md:p-6 overflow-auto">{children}</main>
      </SidebarInset>
      <SathiAgent />
    </>
  );
}
