# Indhan — BEES Fuel Station OS — TODO

## Database & Backend
- [x] Database schema: users, customers, products, transactions, daily_reports, expenses, bank_transactions, weigh_bridge, inventory, purchase_orders
- [x] tRPC router: dashboard (KPIs, real-time metrics, trends)
- [x] tRPC router: daily reconciliation (cash, card, bank matching)
- [x] tRPC router: customers (receivables, credit limits, aging, payments)
- [x] tRPC router: inventory (stock levels, alerts, purchase orders)
- [x] tRPC router: expenses (CRUD, categories, approval workflow)
- [x] tRPC router: bank transactions (NEFT, RTGS, IMPS, Cash, UPI)
- [x] tRPC router: weigh bridge (vehicle logs, cumulative totals)
- [x] tRPC router: P&L reporting (daily, monthly, period-based)
- [x] tRPC router: Excel import (BEES format migration, 3-year historical data)
- [x] tRPC router: Sathi AI agent (NL queries, report generation, anomaly detection)
- [x] tRPC router: sales (list, create, nozzle readings)
- [ ] tRPC router: employees (onboarding, attendance, payroll — Phase 2)

## Frontend - Global
- [x] Premium dark theme (Indhan amber/gold accents, Inter + Plus Jakarta Sans fonts)
- [x] DashboardLayout with sidebar navigation (all 10 modules)
- [x] Indian currency ₹ formatting throughout
- [x] Fuel margins: Petrol ₹3.95/L, Diesel ₹2.49/L
- [x] Responsive design for all screen sizes
- [x] Role-based access control (admin/user roles in schema)
- [ ] Language switcher: Hindi, Telugu (Phase 2)

## Frontend - Modules
- [x] Executive Dashboard: KPIs, sales chart, fuel margins, cash position
- [x] Daily Reconciliation: automated matching, closing stock, cash balance
- [x] Customer Receivables: credit limits, outstanding balances, aging reports
- [x] Inventory Management: stock levels, low-stock alerts, purchase orders (IOC)
- [x] Daily Expenses: category-wise entry, approval workflow, analytics
- [x] Bank Statement: transaction log, reconciliation status, running balance
- [x] P&L Reporting: daily/monthly/period statements, margin breakdowns
- [x] Excel Import: BEES format bulk upload, 3-year historical data migration, auto field-mapping
- [x] Sathi AI Agent: floating chat, NL reports, user guide, anomaly alerts
- [x] Employee Management: UI scaffolded (full backend Phase 2)
- [ ] Weigh Bridge: deferred to Phase 4 (separate business OS)
- [ ] Settings: user management, role assignment, station configuration (Phase 2)

## Testing
- [x] Vitest: auth.logout test (1 test)
- [x] Vitest: Indhan core routers test (10 tests)
- [x] Total: 11 tests passing

## Data Import
- [ ] Import 3 years of BEES historical data (Excel files ready, import module built)

## Phase 2 Backlog
- [ ] Language switcher: Hindi, Telugu
- [ ] Employee full backend: attendance, payroll, PF/ESI
- [ ] Settings module: user management, role assignment
- [ ] Mobile app (React Native)
- [ ] WhatsApp notifications (optional channel)
- [ ] Voice commands (Sathi voice mode)
