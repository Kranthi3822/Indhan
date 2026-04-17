import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import { useState, useCallback } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SplashScreen } from "./components/SplashScreen";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Reconciliation from "./pages/Reconciliation";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import DailyStockStatement from "./pages/DailyStockStatement";
import Customers from "./pages/Customers";
import Expenses from "./pages/Expenses";
import BankStatement from "./pages/BankStatement";
import BankStatementUpload from "./pages/BankStatementUpload";
import Reports from "./pages/Reports";
import Employees from "./pages/Employees";
import ImportData from "./pages/ImportData";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Payroll from "./pages/Payroll";
import Assets from "./pages/Assets";
import BiometricAttendance from "./pages/BiometricAttendance";
import StaffPortal from "./pages/StaffPortal";
import NozzleEntry from "./pages/NozzleEntry";
import FuelPrices from "./pages/FuelPrices";
import ReceiptScanner from "./pages/ReceiptScanner";
import CashHandover from "./pages/CashHandover";
import UserManagement from "./pages/UserManagement";
import AuditLog from "./pages/AuditLog";
import { useAuth } from "./_core/hooks/useAuth";
import Login from "./pages/Login";

// Role-based route access map — mirrors DashboardLayout menuItems roles
type UserRole = "admin" | "owner" | "accountant" | "incharge" | "pump_attendant" | "user";

const ROUTE_ROLES: Record<string, UserRole[]> = {
  "/":                    ["admin", "owner", "accountant"],
  "/reconciliation":      ["admin", "owner", "accountant"],
  "/sales":               ["admin", "owner", "accountant", "incharge"],
  "/inventory":           ["admin", "owner", "accountant", "incharge"],
  "/daily-stock":         ["admin", "owner", "accountant", "incharge"],
  "/customers":           ["admin", "owner", "accountant", "incharge"],
  "/expenses":            ["admin", "owner", "accountant", "incharge"],
  "/bank":                ["admin", "owner", "accountant"],
  "/bank-statement-upload": ["admin", "owner", "accountant"],
  "/reports":             ["admin", "owner", "accountant"],
  "/employees":           ["admin", "owner", "accountant", "incharge"],
  "/payroll":             ["admin", "owner", "accountant"],
  "/attendance":          ["admin", "owner", "accountant", "incharge"],
  "/assets":              ["admin", "owner", "accountant", "incharge"],
  "/import":              ["admin", "owner"],
  "/settings":            ["admin", "owner"],
  "/fuel-prices":         ["admin", "owner", "accountant", "incharge"],
  "/receipt-scanner":     ["admin", "owner", "accountant"],
  "/cash-handover":       ["admin", "owner", "accountant", "incharge"],
  "/nozzle-entry":        ["admin", "owner", "accountant", "incharge", "pump_attendant", "user"],
  "/about":               ["admin", "owner", "accountant", "incharge", "pump_attendant", "user"],
  "/users":               ["admin", "owner"],
  "/audit-log":           ["admin", "owner", "accountant"],
  "/invite/accept":       ["admin", "owner", "accountant", "incharge", "pump_attendant", "user"],
};

// Default landing page per role
function getDefaultPath(role: UserRole): string {
  if (role === "pump_attendant" || role === "user") return "/nozzle-entry";
  if (role === "incharge") return "/nozzle-entry";
  return "/";
}

// Guard component — redirects to default page if role not allowed
function GuardedRoute({ path, component: Component }: { path: string; component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) return null;
  if (!user) return null; // DashboardLayout handles unauthenticated state

  const role = (user.role ?? "user") as UserRole;
  const allowed = ROUTE_ROLES[path] ?? ["admin", "owner"];

  if (!allowed.includes(role)) {
    const defaultPath = getDefaultPath(role);
    // Redirect to default page
    if (typeof window !== "undefined") {
      setLocation(defaultPath);
    }
    return null;
  }

  return <Component />;
}

function Router() {
  const [location] = useLocation();

  if (location === "/login") {
    return <Login />;
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={() => <GuardedRoute path="/" component={Dashboard} />} />
        <Route path="/reconciliation" component={() => <GuardedRoute path="/reconciliation" component={Reconciliation} />} />
        <Route path="/sales" component={() => <GuardedRoute path="/sales" component={Sales} />} />
        <Route path="/inventory" component={() => <GuardedRoute path="/inventory" component={Inventory} />} />
        <Route path="/daily-stock" component={() => <GuardedRoute path="/daily-stock" component={DailyStockStatement} />} />
        <Route path="/customers" component={() => <GuardedRoute path="/customers" component={Customers} />} />
        <Route path="/expenses" component={() => <GuardedRoute path="/expenses" component={Expenses} />} />
        <Route path="/bank" component={() => <GuardedRoute path="/bank" component={BankStatement} />} />
        <Route path="/bank-statement-upload" component={() => <GuardedRoute path="/bank-statement-upload" component={BankStatementUpload} />} />
        <Route path="/reports" component={() => <GuardedRoute path="/reports" component={Reports} />} />
        <Route path="/employees" component={() => <GuardedRoute path="/employees" component={Employees} />} />
        <Route path="/import" component={() => <GuardedRoute path="/import" component={ImportData} />} />
        <Route path="/settings" component={() => <GuardedRoute path="/settings" component={SettingsPage} />} />
        <Route path="/about" component={About} />
        <Route path="/payroll" component={() => <GuardedRoute path="/payroll" component={Payroll} />} />
        <Route path="/attendance" component={() => <GuardedRoute path="/attendance" component={BiometricAttendance} />} />
        <Route path="/staff" component={StaffPortal} />
        <Route path="/assets" component={() => <GuardedRoute path="/assets" component={Assets} />} />
        <Route path="/nozzle-entry" component={NozzleEntry} />
        <Route path="/fuel-prices" component={() => <GuardedRoute path="/fuel-prices" component={FuelPrices} />} />
        <Route path="/receipt-scanner" component={() => <GuardedRoute path="/receipt-scanner" component={ReceiptScanner} />} />
        <Route path="/cash-handover" component={() => <GuardedRoute path="/cash-handover" component={CashHandover} />} />
        <Route path="/users" component={() => <GuardedRoute path="/users" component={UserManagement} />} />
        <Route path="/audit-log" component={() => <GuardedRoute path="/audit-log" component={AuditLog} />} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

// Show splash only on first visit per session (not on every navigation)
const SPLASH_KEY = "indhan_splash_shown";

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // Show splash only if not already shown in this session
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SPLASH_KEY)) return false;
    return true;
  });

  const handleSplashDismiss = useCallback(() => {
    sessionStorage.setItem(SPLASH_KEY, "1");
    setShowSplash(false);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          {showSplash && <SplashScreen onDismiss={handleSplashDismiss} />}
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
