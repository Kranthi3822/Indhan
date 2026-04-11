import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Reconciliation from "./pages/Reconciliation";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import Expenses from "./pages/Expenses";
import BankStatement from "./pages/BankStatement";
import Reports from "./pages/Reports";
import Employees from "./pages/Employees";
import ImportData from "./pages/ImportData";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/reconciliation" component={Reconciliation} />
        <Route path="/sales" component={Sales} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/customers" component={Customers} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/bank" component={BankStatement} />
        <Route path="/reports" component={Reports} />
        <Route path="/employees" component={Employees} />
        <Route path="/import" component={ImportData} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
