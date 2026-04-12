import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
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
import DailyActivity from "./pages/DailyActivity";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/reconciliation" component={Reconciliation} />
        <Route path="/sales" component={Sales} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/daily-stock" component={DailyStockStatement} />
        <Route path="/customers" component={Customers} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/bank" component={BankStatement} />
        <Route path="/bank-statement-upload" component={BankStatementUpload} />
        <Route path="/reports" component={Reports} />
        <Route path="/employees" component={Employees} />
        <Route path="/import" component={ImportData} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/about" component={About} />
        <Route path="/payroll" component={Payroll} />
        <Route path="/attendance" component={BiometricAttendance} />
        <Route path="/staff" component={StaffPortal} />
        <Route path="/assets" component={Assets} />
        <Route path="/nozzle-entry" component={NozzleEntry} />
        <Route path="/fuel-prices" component={FuelPrices} />
        <Route path="/receipt-scanner" component={ReceiptScanner} />
        <Route path="/cash-handover" component={CashHandover} />
        <Route path="/daily-activity" component={DailyActivity} />
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
