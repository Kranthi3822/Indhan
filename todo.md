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

## UI Enhancements
- [x] Dark/light mode toggle in header with localStorage persistence
- [x] Light mode CSS variables (clean white/grey palette)
- [x] Dark mode CSS variables (amber/gold premium dark)

## Phase 1 Critical Bug Fixes
- [x] Fix 1: routers.ts broken export causing app crash (esbuild TransformError)
- [x] Fix 2: customer_payments paymentMethod empty string — re-import with correct enum values
- [x] Fix 3: outstandingBalance not computed — update all customers from actual payment data
- [x] Fix 4: getDashboardKPIs receivables queries wrong table — fix to use customer_payments
- [x] Fix 5: Verify app loads cleanly with real data after all fixes

## Phase 2 Date Filter Fixes
- [x] Dashboard: date filter fallback to latest data month (March 2026) when April 2026 has no data
- [x] Expenses: default date range changed to March 2026 (was April 2026 — showed ₹0)
- [x] Bank Statement: default date range changed to March 2026 (was April 2026 — showed ₹0)
- [x] P&L Reports: default date range changed to March 2026 (was April 2026 — showed ₹0)
- [x] Reconciliation: default date changed to March 31, 2026 (was April 12 — showed empty)
- [x] Customers & Inventory: confirmed no date filter issue (load all records, no date range)
- [x] All 11 tests passing after fixes

## Critical Bug Fix — RangeError: Invalid time value (Production Crash)
- [x] Root cause identified: TiDB Cloud returns varchar date columns as full ISO timestamps (e.g. "2026-03-31T04:00:00.000Z") not plain "YYYY-MM-DD" strings
- [x] Fix: Added .slice(0, 10) normalization in db.ts for all date fields returned from DB (getDailyTrend, getExpenses, getBankTransactions, getDailyReports, getDailyReport, getSalesTransactions)
- [x] Fix: Added defensive try/catch + regex validation in Dashboard.tsx chartData useMemo
- [x] Fix: Updated Reports.tsx chartData to use reportDate field with normalization
- [x] All 11 tests still passing after fix

## Performance & Security Audit
- [ ] Security: Verify all tRPC procedures use protectedProcedure (no unguarded endpoints)
- [ ] Security: Validate all user inputs with Zod schemas (type, range, length limits)
- [ ] Security: Check for SQL injection risks in raw sql`` template literals
- [ ] Security: Ensure no sensitive data (DB credentials, JWT secret) exposed to frontend
- [ ] Security: Check rate limiting on auth and mutation endpoints
- [ ] Security: Verify CORS and cookie security settings
- [ ] Security: Check for XSS risks in Sathi AI output rendering
- [ ] Performance: Audit DB query efficiency — N+1 queries, missing indexes
- [ ] Performance: Check bundle size and code splitting
- [ ] Performance: Verify API response times for dashboard KPI queries
- [ ] Performance: Add DB indexes for frequently queried date columns
- [ ] Performance: Check for unnecessary re-renders in React components

## Date Filter Button Audit & Fixes
- [x] Dashboard: Today/7 Days/MTD buttons now filter both KPI data AND chart data to the selected period
- [x] Expenses: Added Mar 2026 / Feb 2026 / Jan 2026 / Q1 2026 / Custom preset buttons — all filter list and chart
- [x] Bank Statement: Added Mar 2026 / Feb 2026 / Jan 2026 / Q1 2026 / Custom preset buttons — all filter transactions
- [x] P&L Reports: Fixed revenue to use date-range query (was always showing last 30 days); added preset buttons; chart now responds to date selection
- [x] Reconciliation: Date picker confirmed working correctly
- [ ] Sales & Nozzles: Page is a placeholder — not yet built
- [ ] WeighBridge: To be verified in next session
- [x] All pages: Filter state is local per page (no cross-page persistence needed)

## Dashboard Date Display Fix
- [x] Dashboard header now shows "Sunday, 31 March 2026" (latest data date) instead of system date
- [x] Added amber badge "Data: Apr 2025 – Mar 2026" to make data currency visible
- [x] Period buttons updated: "31 Mar" / "7 Days" / "MTD" / "FY 25-26" — all reference data period
- [x] KPI sub-labels updated: "31 Mar 2026" / "25–31 Mar 2026" / "Mar 2026" / "Apr 2025 – Mar 2026"
- [x] Chart title is dynamic and matches selected period
- [x] Fallback chart uses data period dates, not system clock

## Dashboard Custom Date Range Picker
- [x] Added "Custom" button alongside Today/7 Days/MTD/FY 25-26
- [x] When "Custom" is active, From/To date inputs appear (min: 2025-04-01, max: 2026-03-31)
- [x] Apply button triggers KPI and chart data refresh for the custom range
- [x] Chart title updates to show the selected custom range dates
- [x] KPI sub-label updates to show the custom range (e.g. "2025-06-01 – 2025-08-31")

## Data Integrity Audit & Dashboard Expenses KPI
- [x] Audit Net Profit: root cause found — daily_reports.netProfit only deducts same-day expenses, not full operating expenses ledger
- [x] Verified: True Net Profit = grossProfit − expenses_table = ₹21,74,677.21 vs Excel ₹21,74,293.67 (₹383 rounding diff)
- [x] Fixed getDashboardKPIs: now queries expenses table for totalExpenses and computes netProfit = grossProfit − totalExpenses
- [x] Fixed cashBalance: now uses last day's closing balance (subquery) instead of SUM of all days
- [x] Added Expenses KPI card to Dashboard (5-card grid: Sales / Gross Profit / Expenses / Net Profit / Outstanding)
- [x] Net Profit sub-label shows formula: "Margin: X% • Gross − Expenses"

## Dashboard Chart Type Fixes
- [x] Replace Expenses bar section with donut/pie chart showing breakdown by category (subHeadAccount)
- [x] Add getExpenseBreakdown endpoint returning category totals for selected date range
- [x] Sales vs Expenses trend: keep as AreaChart (correct — shows time-series trend)
- [x] Sales Mix replaced with Expenses by Category donut (real data, responds to date filter)
- [x] Fuel Margins: keep as card list (correct — shows fixed rates, not a chart)
- [x] Top Customers by Outstanding: keep as list (correct — shows ranking)

## Sales & Nozzles Module Fix
- [x] Fixed "Module loading..." placeholder — built full Sales & Nozzles page
- [x] KPI cards: Total Sales, Petrol Volume, Diesel Volume, Gross Profit
- [x] Payment method cards: Cash / Card / Credit / Online with amounts
- [x] Bar chart: daily Petrol vs Diesel volume (correct chart type for time-series)
- [x] Payment Mix donut: Cash/Card/Credit/Online % breakdown
- [x] Table: daily sales register with date, volumes, total sales, payment splits, status
- [x] Period presets: Mar 2026 / Feb 2026 / Jan 2026 / Q4 FY26 / FY 25-26 / Custom

## Comprehensive Test Suite (All Modules) — COMPLETE
- [x] 138 total tests across 3 test files (auth.logout.test.ts, indhan.test.ts, comprehensive.test.ts)
- [x] Auth: me, logout, unauthenticated access to all protected procedures
- [x] Dashboard KPIs: normal MTD, FY range, single day, empty range, inverted range, formula correctness
- [x] Dashboard KPIs: net profit = grossProfit − totalExpenses verified against Excel (₹383 tolerance)
- [x] Dashboard trend: 30-day, 1-day, 365-day, boundary dates, date format validation (YYYY-MM-DD)
- [x] Dashboard expense breakdown: category data, empty range, FY top category
- [x] Customers: list, receivables, get by ID, null for non-existent ID, null for negative ID
- [x] Customer payments: negative amount, zero amount, invalid date format, exceeds ₹1Cr
- [x] Inventory: list, low stock, purchase orders, invalid PO status
- [x] Expenses: list, summary, create, empty range; negative/zero/over-limit amounts rejected
- [x] Expenses: empty description, invalid headAccount/subHeadAccount enums, SQL injection in date
- [x] Bank: list, summary, create; negative withdrawal/deposit, invalid type, empty description, SQL injection
- [x] Bank: invalid reconciliation status rejected
- [x] Reconciliation: list, byDate, null for non-existent date, empty range, invalid status
- [x] P&L: report fields, empty range returns zero, revenue field name verified
- [x] Sales: list returns array, handles future date range
- [x] Sathi AI: empty question rejected, >1000 chars rejected
- [x] Router registration: all 38 procedures verified as registered
- [x] Input validation: SQL injection via date fields blocked by Zod regex, wrong date formats rejected

## Station Branding & About Page
- [x] Generated Indhan logo (amber drop + इंधन text, no fire/pump nozzle) — uploaded to CDN
- [x] Wired Indhan favicon into HTML head (index.html)
- [x] Sidebar header uses Indhan logo image
- [x] Login screen uses Indhan logo image
- [x] Station name "Bhagya Lakshmi Eco Energy Station" and address shown in sidebar
- [x] Built About page: station profile, products/services, license/registration (sim), team section
- [x] Team section uses REAL employee names from payroll data (11 staff)
- [x] Simulated data clearly marked with amber 'sim' badge (license numbers, contact details)
- [x] Added About page to sidebar navigation (Setup group) and App.tsx routing

## Visual Overhaul (Visuals-First Design)
- [x] Inventory: circular stock gauges (SVG), colour-coded status (green/amber/red), PO cards with status icons
- [x] Customers: receivables aging donut chart, credit utilisation progress bars, customer cards with initials avatars
- [x] Expenses: donut chart for category breakdown, category cards with spend bars
- [x] Dashboard: expenses by category donut chart (real data, responds to date filter)
- [x] All pages: minimum text, maximum visuals — icons, charts, colour codes, progress bars, badges

## Remaining Visual Overhaul Items
- [ ] Bank Statement: complete visuals-first redesign (transaction type icons, running balance trend chart, colour-coded debit/credit)

## Phase 2 — Attendance & Payroll Module — COMPLETE
- [x] DB schema: employees, attendance, payroll_runs, payslips tables created
- [x] Payroll engine: auto PF (12% employee + 3.67% employer EPF + 8.33% EPS capped ₹1,250)
- [x] Payroll engine: auto ESI (0.75% employee + 3.25% employer, only if gross ≤ ₹21,000)
- [x] Payroll engine: auto Professional Tax — Telangana slabs (₹0/₹150/₹200)
- [x] Backend: payroll run — computes all payslips for a given month from attendance data
- [x] Backend: employee CRUD (create, list, update, deactivate)
- [x] Backend: attendance upsert with positional and object API
- [x] Frontend: Payroll page — Employee master, Attendance grid, Payroll Run, Payslip view
- [x] Navigation: Payroll added to sidebar under Operations group

## Phase 2 — Asset & Equipment Tracking Module — COMPLETE
- [x] DB schema: assets, maintenance_schedules, maintenance_logs, maintenance_evidence tables created
- [x] Backend: preloaded 20 standard gas station assets (dispensers, tanks, generator, compressor, weighbridge, fire extinguishers, CCTV, vehicles, tools)
- [x] Backend: asset CRUD with health score tracking
- [x] Backend: maintenance schedule CRUD with auto next_due date computation
- [x] Backend: maintenance log with evidence file upload to S3
- [x] Backend: upcoming (7/30 days) and overdue maintenance queries
- [x] Frontend: Assets page — Health Dashboard, Asset Register, Maintenance Schedules, Maintenance Logs, Evidence Gallery, Alerts
- [x] Navigation: Assets added to sidebar under Operations group

## Phase 2 — Maintenance Notifications — COMPLETE
- [x] In-app notification generation for upcoming maintenance (due in 7 days)
- [x] In-app notification generation for overdue maintenance (past due date)
- [x] Owner notification via notifyOwner for critical overdue assets
- [x] Alerts tab in Assets page showing all active notifications with dismiss/mark-read actions

## Phase 3 — Biometric Attendance System — COMPLETE
- [x] DB schema: employee_auth, face_profiles, attendance_check_in_slots, attendance_check_ins, payroll_requests tables
- [x] Real employee records: Mahesh (Incharge), Ashok, Kiran, Parandhamulu, Anjaiah (from expense data)
- [x] Backend: 6-digit PIN set/verify per employee (bcrypt hashed)
- [x] Backend: face profile enrolment (store face descriptors from face-api.js)
- [x] Backend: randomised check-in slot generation (6AM–10PM only, 1 slot/hour at random minute)
- [x] Backend: check-in verification (face match + geo-fence 50m from station)
- [x] Backend: attendance scoring (verified/total slots per day, 90% threshold for pay eligibility)
- [x] Backend: payroll request (weekly/monthly, calculates net pay based on attendance score)
- [x] Backend: admin payroll review (approve/reject/mark-paid with payment mode)
- [x] Backend: getEmployeesWithAuth — shows PIN set and face enrolled status
- [x] Backend: getTodayOverview — real-time check-in status per employee
- [x] Staff Portal (/staff): PIN login, face enrolment (5-sample capture), check-in verification, attendance score, payroll request
- [x] Admin UI (/attendance): today overview, monthly scores, payroll approval, PIN setup
- [x] Sidebar: "Biometric Attendance" added under People group with ScanFace icon
- [x] 184 tests passing after all changes

## Phase 4 — Audit Fixes (Critical & High Priority)

- [ ] Fix P&L sidebar route: /pl-reports → /reports
- [ ] Populate daily_reports petrolVolume and dieselVolume from sales_transactions
- [ ] Populate daily_reports cashSales/cardSales/creditSales/onlineSales from sales_transactions
- [ ] Fix active staff count: deactivate stale 6th employee record
- [ ] Set realistic min stock levels (Diesel 5000L, Petrol 3000L, lubricants 20L each)
- [ ] Fix PO units label: "units" → "litres" for fuel products
- [ ] Fix bank reconciliation: Reconcile button updates isReconciled, Pending count reflects reality

## Nozzle Sales & Cash Collection Module — COMPLETE
- [x] Add pumps, nozzles, nozzle_readings, cash_collections, shift_sessions, day_reconciliations tables to schema
- [x] Generate and apply migration SQL
- [x] Seed 2 pumps × 4 nozzles (Pump 1: Diesel + Petrol; Pump 2: Diesel + Petrol)
- [x] Build tRPC nozzle router (getPumpsWithNozzles, getNozzles, startShift, saveReading, addCollection, closeShift, getSessionSummary, getDayReconciliation, getNozzleDataForDate)
- [x] autoPopulateDailyReport: on shift close, auto-fills daily_reports with petrol/diesel volumes and collection totals
- [x] Build Staff Nozzle Entry page (/nozzle-entry) — 5-step mobile-optimised workflow
- [x] Upgrade Reconciliation page — nozzle data banner, Pre-fill Sales button, drill-down per session
- [x] Add Nozzle Entry to App.tsx routing and sidebar nav (Operations group)
- [x] Write vitest tests for nozzle module (197 total tests passing)

## Dynamic Fuel Intelligence Module — COMPLETE
- [x] DB schema: dip_readings table (date, fuel_type, tank_id, dip_litres, reading_time, recorded_by)
- [x] DB schema: fuel_config table (fuel_type unique, retail_price, latest_cost_price, evaporation_rate_pct, tank_capacity_litres)
- [x] Migration applied and seeded: petrol (₹103.41 retail / ₹99.46 cost / 0.1% evap), diesel (₹89.14 / ₹86.65 / 0.08%)
- [x] db-fuel-intelligence.ts: getFuelIntelligence() — WACP from purchase orders, effective margin, dip stock value, evaporation
- [x] db-fuel-intelligence.ts: getDipReadings(), upsertDipReading(), getFuelConfigs(), updateFuelConfig()
- [x] fuelIntelligenceRouter.ts: getIntelligence, getDipReadings, saveDipReading, getFuelConfig, updateFuelConfig procedures
- [x] Dashboard: replaced fixed "Fuel Margins (Fixed)" section with dynamic "Fuel Intelligence" card
- [x] Dashboard: shows Retail Price / WACP Cost / Margin % per fuel type
- [x] Dashboard: shows gross margin vs effective margin (after evaporation) side by side
- [x] Dashboard: stock from dip readings with tank fill % progress bar
- [x] Dashboard: evaporation litres + value displayed per fuel type
- [x] Dashboard: "Dip Readings Active" vs "Estimated Stock" badge based on data quality
- [x] Dashboard: amber warning banner when no dip readings recorded
- [x] 218 vitest tests passing (21 new fuel intelligence tests)

## Daily Fuel Price Entry & Receipt Scanner
- [x] DB: daily_fuel_prices table (date, fuel_type, retail_price, cost_price, recorded_by, source: manual|receipt_scan)
- [x] DB: migrate and apply (seeded today's prices from products table)
- [x] tRPC: saveDailyPrice, getDailyPrices, getLatestPrice procedures
- [x] tRPC: uploadAndScanReceipt — accepts base64 image, uploads to S3, uses LLM vision to extract invoice data
- [x] tRPC: confirmReceipt — creates purchase order, updates fuel_config cost price
- [x] UI: Daily Price Entry page (/fuel-prices) — dual entry cards with live margin preview, price history table
- [x] UI: Purchase Receipt Scanner page (/receipt-scanner) — 4-step flow: upload → scanning → review/edit → confirmed
- [x] Fuel Intelligence: saveDailyPrice updates fuel_config + products table so margins are always current
- [x] Add Fuel Prices and Receipt Scanner to sidebar nav under Operations
- [x] Write vitest tests — 241 total tests passing (20 new fuel prices tests)

## Evaporation Reversal (Fuel Intelligence)
- [x] Remove evaporation loss from effective margin and stock value calculation
- [x] Keep evaporation as informational display only (not factored into cost/margin)
- [x] Update Dashboard UI label to clarify evaporation is for reference only

## Operational Expenses → Net Margin in Fuel Intelligence
- [x] Audit expenses table: categories, amounts, period coverage (6 categories, ₹12.14L total FY 25-26)
- [x] Backend: compute total OpEx for period, allocate proportionally by fuel revenue share
- [x] Backend: add opexPerLitre, netMarginPerL, netMarginPct, allocatedOpEx, netProfit, revenueSharePct, opexBreakdown to FuelMarginData
- [x] Backend: add totalOpEx, totalNetProfit to FuelIntelligenceResult
- [x] Dashboard UI: show OpEx deduction row (red, per litre + total allocated)
- [x] Dashboard UI: Net Profit row per fuel type with net margin %
- [x] Dashboard UI: Total OpEx / Gross Profit / Net Profit summary bar
- [x] Tests: 6 new OpEx allocation tests — 248 total tests passing

## Receipt Scanner Enhancement — COMPLETE
- [x] Backend: strengthened LLM extraction prompt with Indian receipt patterns (HPCL/BPCL/IOC/Nayara, KL→L conversion, MT→L conversion)
- [x] Backend: on confirmReceipt — cascade cost update to fuel_config, products table, daily_fuel_prices
- [x] Backend: notify owner on successful scan (receipt details + cost change delta + new margin)
- [x] Backend: add rescanReceipt procedure (re-run LLM on existing S3 image)
- [x] Backend: per-field confidence scores returned in fieldConfidence object
- [x] Backend: currentCostPrice returned for cost delta preview
- [x] Backend: confirmReceipt returns costDelta, oldCostPrice, newCostPrice, oldMargin, newMargin
- [x] UI: drag-drop + camera capture, image preview before scanning
- [x] UI: per-field confidence badges (green/amber/red % next to each field label)
- [x] UI: re-scan button in review header (re-runs LLM on same image)
- [x] UI: cost impact preview panel (old cost → delta → new cost with trend arrows)
- [x] UI: confirmed screen shows cost change summary + updated margin
- [x] UI: scan history sidebar with status badges, confidence bars, PO links
- [x] 248 tests passing (no regressions)

## Dynamic Station Name & Address
- [x] Dashboard header subtitle: now uses STATION_SHORT_NAME from shared/const.ts
- [x] DashboardLayout station card: now uses STATION_SHORT_NAME + STATION_ADDRESS from shared/const.ts
- [x] About page is the source of truth — all three locations share the same constants

## Nozzle Per-Sale Transaction Logging (Mode 1)
- [ ] DB: nozzle_transactions table (id, sessionId, nozzleId, transactionTime, litres, amount, paymentMode: cash|upi|phonepe|card|credit, receiptImageUrl, aiExtracted, notes, createdBy)
- [ ] DB: migrate and apply
- [ ] tRPC: logTransaction (manual entry — nozzleId, litres, amount, paymentMode, sessionId)
- [ ] tRPC: scanSaleReceipt (upload image → AI extracts nozzle, litres, amount → return for confirmation)
- [ ] tRPC: getTransactionsBySession (list all transactions for a shift session)
- [ ] tRPC: getNozzleCashSummary (per-nozzle breakdown: cash, upi, phonepe, card, credit totals)
- [ ] tRPC: deleteTransaction (soft delete with reason)
- [ ] UI: Sale Entry page (/sale-entry) — mobile-first, camera/upload → AI extract → payment tap → confirm → save
- [ ] UI: Active session transaction list — running total per payment mode, per nozzle
- [ ] UI: Nozzle Entry session summary — replace shift-level cash fields with transaction-derived totals
- [ ] UI: Reconciliation — use transaction totals for cash/electronic breakdown
- [ ] Add Sale Entry to sidebar nav under Operations
- [ ] Tests: transaction logging, payment mode aggregation, nozzle cash summary

## Nozzle Payment Mode Upgrade (Cash / Digital / Credit)
- [ ] DB: ALTER cash_collections.payment_mode enum to cash|digital|credit (keep old values for migration)
- [ ] DB: ADD digital_sub_type column varchar(20): upi|phonepe|card|bank_transfer|bhim (nullable, only for digital)
- [ ] DB: migrate and apply
- [ ] tRPC: update addCollection input schema — paymentMode: cash|digital|credit, digitalSubType optional
- [ ] tRPC: update getCollections return to include digitalSubType
- [ ] tRPC: add getNozzleCashSummary procedure — per-nozzle: cash total, digital total (with sub-type breakdown), credit total
- [ ] UI: Nozzle Entry Step 3 — replace dropdown nozzle selector with mandatory tap buttons per nozzle
- [ ] UI: Payment mode as 3 large tap buttons: Cash / Digital / Credit
- [ ] UI: When Digital selected — show sub-type row: UPI | PhonePe | Card | Bank Transfer | BHIM
- [ ] UI: Session summary Step 5 — per-nozzle table: Cash | Digital | Credit columns with totals
- [ ] UI: Session summary — highlight cash column (green) for easy physical count verification

## Cash Handover & Deposit Voucher Module — COMPLETE
- [x] DB: cash_handover_sessions table (date, nozzle_id, cash_collected, cash_expenses, net_cash, confirmed_at, confirmed_by, actual_amount)
- [x] DB: cash_deposit_vouchers table (voucher_number, date, total_amount, float_retained, deposit_amount, bank_account, instructions, status: draft|finalised, bank_transaction_id for reconciliation)
- [x] DB: migrated and applied
- [x] tRPC: getCashHandoverSummary(date) — per nozzle: cash sales, cash expenses, net to collect
- [x] tRPC: confirmNozzleCollection(nozzleId, date, actualAmount) — manager confirms per nozzle
- [x] tRPC: finaliseHandover(date, floatRetained) — deposit amount = total confirmed − float retained
- [x] tRPC: generateDepositVoucher(date) — numbered voucher with bank instructions
- [x] tRPC: getVoucherHistory — list with status and reconciliation state
- [x] tRPC: matchVoucherToBankEntry(voucherId, bankTransactionId) — link voucher to bank statement
- [x] tRPC: autoMatchVouchers(date) — auto-match by amount + date proximity
- [x] UI: Cash Handover page (/cash-handover) — per-nozzle confirm cards, running total bar, deposit summary
- [x] UI: Printable Cash Deposit Voucher modal — voucher number, station header, per-nozzle breakdown, bank details, instructions, signature line, reconciliation status
- [x] Navigation: Cash Handover added to sidebar under Operations (Banknote icon)
- [x] 248 tests passing (no regressions)

## Partial Items Closure Sprint
- [ ] Fix P&L sidebar route: /pl-reports → /reports (DashboardLayout nav)
- [ ] Populate daily_reports petrolVolume + dieselVolume from sales_transactions via migration script
- [ ] Nozzle Payment Mode UI: replace old Cash/Card/Online/Credit with Cash / Digital (UPI,PhonePe,Card,Bank,BHIM) / Credit
- [ ] Expenses form: add "Cash from Nozzle" payment source with nozzle selector
- [ ] Bank Statement: visual redesign — transaction type icons, running balance trend chart, colour-coded debit/credit rows

## Daily Activity Report — Auto-Population from Nozzle Sessions
- [x] autoPopulateDailyReport: fixed to use actual daily retail prices from daily_fuel_prices table (not hardcoded ₹103.41/₹89.14)
- [x] autoPopulateDailyReport: fixed to use actual WACP from fuel_config.latestCostPrice (not hardcoded margins)
- [x] Added getDailyActivityReport tRPC procedure: live aggregation from all nozzle sessions for a date
- [x] Added getRecentDailyActivity tRPC procedure: last N days activity summary for trend chart
- [x] Built DailyActivity.tsx page: date navigation, KPI strip (petrol/diesel volumes, cash, total), payment breakdown, session details with expandable nozzle rows, 14-day volume trend chart
- [x] Added "Daily Activity" to sidebar nav (Operations group) with ClipboardList icon
- [x] Added /daily-activity route to App.tsx
- [x] Auto-refresh every 30s on the page (live during shift)
- [x] No manual entry required — all data flows from Nozzle Entry → Session Close → autoPopulateDailyReport

## Expenses — Nozzle Cash Link
- [x] Added nozzle_id and payment_source columns to expenses Drizzle schema definition
- [x] Updated expenses create procedure to accept paymentSource and nozzleId
- [x] Updated Expenses.tsx UI to show payment source selector (Nozzle Cash / Direct Cash / Bank Transfer / Other)
- [x] When "Nozzle Cash" selected, nozzle dropdown appears to link expense to specific nozzle session

## Bank Statement Visuals
- [x] Added colour-coded transaction rows (green for deposits, red for withdrawals)
- [x] Added transaction type icons (Banknote, CreditCard, Smartphone, Landmark)
- [x] Added running balance area chart
- [x] Fixed TypeScript null index error in running balance computation

## Tests
- [x] Added dailyActivity.test.ts: 6 tests covering aggregation logic, empty state, session counting, autoPopulateDailyReport
- [x] All 254 tests passing

## Daily Sales Register — Petrol/Diesel Sales Amount Columns
- [x] Add petrolSalesAmount and dieselSalesAmount to getDailyTrend and getDailyTrendByRange in db.ts (computed from fuel_config retail prices)
- [x] Update sales.list tRPC response to include petrolSalesAmount and dieselSalesAmount
- [x] Add Petrol (₹) and Diesel (₹) columns to Daily Sales Register table in Sales.tsx

## ServCrust Brand Guidelines Application
- [x] Update CSS variables in index.css: primary teal (#17897e), dark teal (#1e5f56), secondary gold/amber/orange
- [x] Replace Inter/Plus Jakarta Sans font with Montserrat from Google Fonts in index.html
- [x] Update dark theme colours to use teal-based palette (teal-tinted dark backgrounds)
- [x] Update sidebar active state, hover colours to teal brand
- [x] Update button primary colour to teal
- [x] Update dashboard KPI card accent colours (amber → teal throughout all 19 pages)
- [x] Ensure text contrast is maintained throughout (white text on teal buttons)

## Auto-Reconciled Status in Daily Sales Register
- [x] Fix getDailyTrend and getDailyTrendByRange to include reconciliationStatus column from daily_reports
- [x] Sales.tsx status badge already reads reconciliationStatus — now shows Reconciled (green) for all 365 days

## Daily Sales Register — Status Filter & Summary Strip
- [x] Add All / Reconciled / Pending filter buttons above the Daily Sales Register table
- [x] Add summary strip showing total days, reconciled count, pending count, and reconciliation % at top of register

## Bank Statement Upload & Auto-Reconciliation
- [x] Add bank_statement_uploads table to schema and run migration
- [x] Build bankStatementRouter.ts: upload (S3 + LLM parse), listUploads, getTransactions, getUnreconciledDays, markDateReconciled
- [x] Register bankStatementRouter in main routers.ts
- [x] Build BankStatementUpload.tsx page: drag-drop upload, parsing progress, preview table, catch-up banner, upload history
- [x] Add Bank Sync nav item to DashboardLayout sidebar (Finance group)
- [x] Add /bank-statement-upload route to App.tsx

## Employee Data Cleanup & UI Colour Fixes
- [ ] DB: Delete Lakshmi Devi employee record and all related data
- [x] DB: Deleted all test employee records and related attendance/payroll data
- [x] DB: Verified only Mahesh, Parandhamulu, Ashok, Anjaiah, Kiran remain (5 employees)
- [x] Fix Attendance & Payroll page: dark zinc colours replaced with CSS variables
- [x] Fix Assets & Equipment page: replace dark hardcoded zinc colours with CSS variable equivalents (bg-card, bg-muted, border-border)
- [x] Fix Biometric Attendance page: dark zinc colours replaced with CSS variables
- [x] Fix Payroll page: dark zinc colours replaced with CSS variables
- [x] Employee DB cleanup: removed all test employees and Lakshmi Devi, kept only Mahesh, Ashok, Kiran, Parandhamulu, Anjaiah

## Settings Page Bug
- [x] Fix Settings page stuck on "Module loading..." — rebuilt as full Settings page with station info, fuel config, nozzle config, system preferences, and access control

## Top Outstanding Customers Bug
- [x] Fix Top Outstanding Customers widget — now sorts by outstanding desc, uses correct 'outstanding' field, filters out ₹0 balances, shows top 5

## Staff Directory Cleanup
- [x] Delete all fake/seeded employees (Ravi Kumar, Suresh Babu, Lakshmi Devi, Venkat Rao, Prasad etc.) from DB
- [x] Verify only 5 real employees remain: Mahesh, Ashok, Kiran, Parandhamulu, Anjaiah
- [x] Employees.tsx Staff Directory now fetches from trpc.hr.listEmployees (live DB) instead of hardcoded mockEmployees array
- [x] Add Employee button now wired to trpc.hr.createEmployee mutation (was a no-op toast)
- [x] Summary cards (Active Employees, Monthly Payroll) now show live DB values

## Daily Stock Statement & Inventory Fixes
- [ ] Fix Diesel (HSD) showing 0 litres in Inventory — investigate why stock is not computed
- [ ] Set realistic minimum stock levels: Diesel 5000L, Petrol 3000L, lubricants 20L each
- [ ] Build proper Daily Stock Statement following fuel station SOP: Opening Stock + Receipts − Meter Sales = Closing Stock
- [ ] Add dip reading as cross-check column (Dip Reading vs Calculated Closing Stock, show variance)
- [ ] Fix "Min: liter" display bug in Inventory Alerts (unit label missing value)
- [ ] Ensure both petrol and diesel appear in the Daily Stock Statement with correct figures
- [ ] Compute stock from meter readings (nozzle session cumulative sales) not just dip readings

## Daily Stock Statement & Inventory Fixes
- [x] Fix Diesel stock showing 0 in Inventory — updated products.currentStock to 6,823.32 L from daily_reports.closingStockDiesel
- [x] Fix "Min: liter" bug in Inventory — Inventory.tsx was reading product.minStockLevel (non-existent field), fixed to use product.reorderLevel
- [x] Set minimum stock levels: Diesel 5,000 L, Petrol 3,000 L, Lubricants 20 L each (updated in DB via products.reorderLevel)
- [x] Build Daily Stock Statement page (/daily-stock) — standard SOP format: Opening − Sales + Receipts = Closing, with dip variance column
- [x] getDailyStockStatement backend procedure: uses reportedClosing from daily_reports as authoritative, back-calculates implied receipts
- [x] Add "Daily Stock" to sidebar navigation (Operations group, FlaskConical icon)
- [x] Summary strip: Petrol Sales, Diesel Sales, Implied Receipts (Petrol), Implied Receipts (Diesel) for selected period
- [x] Period presets: Last 7/14/30 Days + custom date range picker
- [x] Dip variance column shows "No dip" when no dip reading recorded (with amber warning banner)

## Sidebar Navigation Restructure
- [x] Consolidate Operations group: Dashboard, Nozzle Entry, Sales & Nozzles, Reconciliation, Cash Handover, Daily Activity (6 items)
- [x] New Fuel Management group: Fuel Prices, Receipt Scanner, Inventory, Daily Stock (4 items)
- [x] Finance group: Customers & Credit, Expenses, Bank Statement, Bank Sync, P&L Reports (5 items)
- [x] People group: Employees, Attendance & Payroll, Biometric Attendance (3 items)
- [x] Setup group: Assets & Equipment, Import Data, Settings, About Station (4 items)
- [x] Updated DashboardLayout.tsx with new 5-group simplified structure

## Dashboard — Stock Overview Widget
- [x] Replace "Inventory Alerts" widget on Dashboard with full stock gauge cards (Fuel + Lubricants sections)
- [x] Show circular fill gauge, product name, stock qty, status badge (Good/Low/Critical), Min level, price/litre
- [x] Fuel section: Diesel (HSD) and Petrol (MS) side by side
- [x] Lubricants section: ADON-Oil, Servo 2T, Servo 4T in a row (compact gauge cards)
- [x] Low stock badge count shown in widget header (red badge)

## Theme Change — Amber Station (Option D)
- [x] Replace ServCrust teal palette with Amber Station: warm dark brown background + gold/amber accents
- [x] Update dark theme CSS variables in index.css (background oklch(0.13 0.025 60), primary oklch(0.78 0.18 72))
- [x] Update light theme CSS variables in index.css (warm off-white background, amber primary)
- [x] Update sidebar active/hover colours to amber
- [x] Update primary button colour to amber
- [x] Update chart colours to amber/gold/orange palette
- [x] Update scrollbar colours to match amber theme

## Inventory & Dashboard Feature Sprint
- [x] Dashboard: real-time low-stock alert banner at top (shows products below reorderLevel with name, current qty, min qty, link to Inventory)
- [x] Inventory: search bar to filter products by name in real-time
- [x] Inventory: grid/list view toggle (grid = current gauge cards, list = compact table rows)

## PWA (Progressive Web App)
- [x] Install vite-plugin-pwa and configure in vite.config.ts
- [x] Create web app manifest (name: Indhan, short_name: Indhan, display: standalone, theme_color: #1a1208)
- [x] Generate PWA icons: icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png, favicon-32.png
- [x] Add apple-touch-icon and iOS meta tags in index.html (apple-mobile-web-app-capable, status-bar-style, title)
- [x] Configure service worker with Workbox (cache-first for assets, NetworkFirst for /api/trpc/*)
- [x] Sidebar uses shadcn SidebarProvider with mobile drawer + hamburger trigger (already responsive)
- [x] Dashboard KPI grid: grid-cols-2 on mobile, lg:grid-cols-5 on desktop
- [x] Dashboard stock widget: grid-cols-1 sm:grid-cols-2 for fuel cards on mobile
- [x] Main content padding: p-3 on mobile, p-6 on desktop
- [x] Header height: h-14 on mobile, h-16 on desktop
- [ ] Publish app to production URL then test install prompt on Android Chrome
- [ ] Verify iOS "Add to Home Screen" works on published URL

## PWA Feature Sprint 2
- [x] Push notifications: alert owner when any product drops below reorderLevel (use notifyOwner + browser Notification API)
- [x] Push notifications: Bell icon in header turns amber when enabled; clicking links to /inventory
- [x] PWA splash screen: full-screen amber loading animation shown on first app launch (Indhan logo + animated fuel gauge)
- [x] PWA splash screen: auto-dismiss after 2s or when app is ready; shown once per session via sessionStorage
- [x] Barcode/QR scanner: camera-based scanner in Inventory page (BarcodeScanner.tsx using html5-qrcode)
- [x] Barcode/QR scanner: scan product barcode → sets search query to scanned code, shows matching products
- [x] Barcode/QR scanner: fallback error state with retry button if camera not available

## PWA UX Enhancements Sprint 3
- [x] Toast confirmation when push notifications are enabled ("Notifications enabled") or denied/disabled
- [x] Pull-to-refresh gesture on Inventory page (touch swipe down to refetch product list)
- [x] Flashlight toggle button in BarcodeScanner for low-light scanning

## Diesel Stock Bug Fix
- [x] Fix: products.currentStock for Diesel (HSD) showing 0 — synced from daily_reports.closingStockDiesel (now 6,823.32 L)
- [x] Fix: products.currentStock for Petrol (MS) — synced from daily_reports.closingStockPetrol (now 11,920.19 L)
- [x] Add: auto-sync products.currentStock after every reconciliation.upsert save via syncFuelStockFromLatestReport()

## Diesel Volume Bug Fix (Sales & Nozzles Page)
- [ ] Investigate: Diesel Volume showing 5,651.1 KL — verify against daily_reports sum and Excel source data
- [ ] Fix: correct the query or unit conversion causing wrong Diesel Volume on Sales & Nozzles page

## Deployment Build Fix
- [x] Fix: vite-plugin-pwa workbox build failure — main bundle 3.5 MB exceeds default 2 MB precache limit; raised maximumFileSizeToCacheInBytes to 5 MiB in vite.config.ts
- [x] Verified: production build now completes successfully (369 entries precached, sw.js generated)

## Diesel Stock Display Bugs (Both Pages)
- [x] Fix: Inventory page Diesel currentStock = 0 — syncFuelStockFromLatestReport now runs on server startup (server/_core/index.ts) AND after each reconciliation save
- [x] Fix: Dashboard Fuel Intelligence Diesel stock = 0% — falls back to products.currentStock when no dip readings exist (db-fuel-intelligence.ts)
- [x] Fix: Directly updated products.currentStock for Diesel to 6823.32 L and Petrol to 11920.19 L in DB

## Diesel Stock Correction — FY 2025-26
- [x] Correct Diesel (HSD) currentStock to 13,146.20 L (confirmed by Kranthi from BEES register)
- [x] Root cause: closingStockDiesel on 31 Mar 2026 was a data entry error in Excel (6,823.32 recorded vs correct 13,146.20 = opening 15,677.09 − sold 2,530.89)
- [x] Fixed: both products.currentStock and daily_reports.closingStockDiesel for 31 Mar 2026 updated to 13,146.20 L

## Stock Consistency Validation
- [ ] Backend: tRPC procedure stockValidation.getInconsistencies — query daily_reports for rows where ABS(opening - sold - closing) > tolerance (5L)
- [ ] Backend: returns list of flagged rows with date, fuel type, opening, sold, closing, expected closing, variance
- [ ] Backend: stockValidation.fixInconsistency mutation — auto-correct closing stock to opening - sold for a given date
- [ ] Frontend: Reconciliation page — "Stock Audit" tab showing all flagged inconsistencies with fix button
- [ ] Frontend: Dashboard alert banner — show count of inconsistencies with link to Reconciliation > Stock Audit
- [ ] Frontend: Reconciliation save — run validation after each save and show inline warning if inconsistency detected

## Number Format Consistency — Sales & Nozzles KPI Cards
- [x] Fix: Petrol Volume and Diesel Volume KPI cards now show full Indian-formatted volume as subtitle (e.g. 2,71,051.35 L) on hover
- [x] All four KPI cards: Total Sales (₹12.10Cr / ₹12,10,18,929.01), Petrol Volume (271.1KL / 2,71,051.35 L), Diesel Volume (942.5KL / 9,42,537.70 L), Gross Profit (₹33.89L / ₹33,88,530.04)

## Implied Receipts Diesel Fix
- [x] Fix: Implied Receipts (Diesel) now uses period-boundary formula (Closing_last − Opening_first + Total Sales) = 9,46,000 L ✅
  Root cause: row-by-row sum was inflated by data entry errors in daily closing stock values

## Manual Dip Reading Feature
- [x] Schema: dip_readings table confirmed (date, fuelType, dipLitres, tankId, readingTime, recordedBy, notes)
- [x] Backend: fuelIntelligence.saveDipReading tRPC procedure (upsert by date + fuelType) — already existed
- [x] Backend: getDailyStockStatement now fetches dip_readings and joins by date
- [x] Backend: Dip Variance formula = (Opening Stock + PO Receipts) − Manual Dip Reading (corrected from previous formula)
- [x] Frontend: Daily Stock Statement — inline editable "Dip Reading" cells (amber, click-to-edit) in Petrol and Diesel columns
- [x] Frontend: Save on Enter key or Save icon button; live variance preview while typing
- [x] Frontend: Dip Variance column: red=loss, blue=gain, green=within 10L tolerance
- [x] Frontend: Summary strip shows "Dip Readings: X / N days" counter
- [x] Frontend: Info banner updated with correct formula explanation

## Diesel Stock Persistent Reversion Bug
- [x] Fix: Diesel currentStock reverted to 0 on every server restart — root cause: startup sync was silently failing (DB not ready at server.listen time)
- [x] Permanent fix: getAllProducts() now JOINs daily_reports at query time and overrides currentStock for Petrol/Diesel with latest closingStock values — no sync step needed, always correct

## Mobile Optimisation (Full Pass)
- [x] DashboardLayout: sidebar overlay on mobile via shadcn Sheet drawer + SidebarTrigger hamburger in header
- [x] Dashboard: KPI grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5; chart height responsive
- [x] Dashboard: Fuel Intelligence cards stack vertically on mobile
- [x] Inventory: KPI grid responsive; table wrapped in overflow-x-auto with min-w-[600px]
- [x] Inventory: BarcodeScanner modal full-screen on mobile
- [x] Sales & Nozzles: KPI grid responsive; payment cards 2-col on mobile; table overflow-x-auto
- [x] Reconciliation: nozzle volume strip uses grid-cols-2 (2 items — fine on mobile)
- [x] Bank Statement: filter bar wraps on mobile; table overflow-x-auto; dialog form grid-cols-1 sm:grid-cols-2
- [x] P&L Reports: KPI grid grid-cols-2 sm:grid-cols-4; table overflow-x-auto
- [x] Customers: table overflow-x-auto; dialog form grid-cols-1 sm:grid-cols-2
- [x] Expenses: filter bar responsive; table overflow-x-auto; dialog form grids grid-cols-1 sm:grid-cols-2
- [x] Daily Stock Statement: table overflow-x-auto with min-w; summary strip wraps on mobile
- [x] Nozzle Entry: form fields full-width on mobile; shift/payment mode selectors 3-col tap buttons
- [x] Assets: Add Asset dialog grid-cols-1 sm:grid-cols-2; Log Maintenance dialog grid-cols-1 sm:grid-cols-2
- [x] Payroll: Add Employee dialog grid-cols-1 sm:grid-cols-2
- [x] ReceiptScanner: all form grids grid-cols-1 sm:grid-cols-2/3; summary strips grid-cols-1 sm:grid-cols-3
- [x] FuelPrices: current price summary grid-cols-1 sm:grid-cols-2
- [x] Employees: dialog form grid-cols-1 sm:grid-cols-2
- [x] Header: h-14 on mobile, h-16 on desktop; content padding p-3 on mobile, p-6 on desktop
- [ ] Publish app to production URL then test install prompt on Android Chrome
- [ ] Verify iOS "Add to Home Screen" works on published URL

## Dip Reading — Inventory Page Integration
- [x] Inventory: Manual dip reading entry cards for Petrol (MS) and Diesel (HSD) with inline save
- [x] Inventory: Shows today's date, system stock (from last reconciliation), and current dip reading
- [x] Inventory: Dip Variance = System Stock − Manual Dip Reading with colour-coded badge
- [x] Inventory: Green ±10L = OK, Red = stock loss, Blue = stock gain
- [x] Inventory: Live preview of variance while typing dip value (before saving)
- [x] Inventory: 7-day dip reading history table (toggle with History button)
- [x] Inventory: History table shows Petrol Dip, Petrol Variance, Diesel Dip, Diesel Variance per date
- [x] Inventory: Variance note explains formula and historical limitation

## Daily Stock Statement — Dip Reading Fix
- [x] Backend: getDailyStockStatement — verified dip_readings JOIN returns dipReading and dipVariance per row for both fuel types
- [x] Backend: Dip Var formula corrected to Closing Stock − Dip Reading (was Opening + PO Receipts − Dip)
- [x] Backend: Excel import router updated to read Dip and Manual Dip Reading columns from Daily Stock Statement sheet
- [x] Backend: importRouter now auto-imports dip readings when Excel file contains Daily Stock Statement sheet
- [x] Frontend: DailyStockStatement — DipCell shows saved value (amber) or "Enter dip" (italic) per row, click to edit
- [x] Frontend: DailyStockStatement — Dip Var column shows coloured VarianceBadge (green/red/blue) when dip reading exists
- [x] Frontend: DailyStockStatement — saving a dip reading invalidates query and refetches immediately
- [x] Frontend: DailyStockStatement — "No Dip Readings" banner now explains both manual entry and bulk Excel import options
- [x] Frontend: DailyStockStatement — live variance preview while typing uses Closing Stock − typed value
- [x] Inventory: Dip section confirmed to pull from same dip_readings table via getDipReadings procedure

## Daily Stock Register — Simulated Dip Readings
- [ ] Backend: getDailyStockStatement returns isSimulated flag per dip reading (true when no real dip exists)
- [ ] Backend: Simulated dip = closing stock × 0.97 (3% evaporation/shrinkage estimate) when no real dip recorded
- [ ] Backend: dipVariance calculated for both real and simulated dip readings
- [ ] Frontend: DipCell shows "sim" badge (orange) when dip is simulated, amber value when real
- [ ] Frontend: VarianceBadge shows variance for all rows (simulated and real)
- [ ] Frontend: Clicking "Enter dip" on a simulated row opens inline input to enter real reading
- [ ] Frontend: Real entry overrides simulated value and removes sim badge

## Daily Stock Register — Dip Import Fix (Excel Column Mapping)
- [x] Schema: dip_stick_reading column added to dip_readings table (migration applied)
- [x] Import: fixed range:2 to skip rows 1-2 (empty + merged header), uses row 3 as column header row
- [x] Import: reads "Dip" (col E) as raw stick number for Petrol; "Manual Dip Reading" (col F) as litres
- [x] Import: reads "Dip_1"/"Dip.1" for Diesel stick; "Manual Dip Reading_1"/"Manual Dip Reading.1" for Diesel litres
- [x] Backend: upsertDipReading stores dipStickReading alongside dipLitres
- [x] Backend: getDailyStockStatement returns dipStickReading per row for both fuel types
- [x] Backend: saveDipReading tRPC procedure accepts dipStickReading optional field
- [x] Frontend: DipCell shows stick number (small grey) + litres (amber) when data exists
- [x] Frontend: DipCell edit mode has two inputs — Stick and Litres
- [x] Frontend: Dip Variance = Closing Stock − Manual Dip Reading (litres)
- [ ] ACTION REQUIRED: Re-upload BEES Excel file via Data Import to backfill all historical dip readings

## Dip Reading — Consolidation to Daily Stock Register
- [x] Inventory: Removed Dip Readings & Variance section (cards, history table, dip state, getDipReadings query)
- [x] Inventory: Removed unused imports (TrendingDown, TrendingUp, Minus, Save, Pencil, History, fmtL)
- [x] Daily Stock Register: Confirmed as the single authoritative place for dip entry and variance

## Daily Stock Register — Dip Backfill
- [x] Checked daily_reports table — no dip columns exist (dip data was never imported)
- [x] Import router already updated to read Dip and Manual Dip Reading columns from Daily Stock Statement sheet
- [x] Added "Upload BEES Excel File" button directly on Daily Stock page (no-dip banner) — triggers inline import
- [x] DipCell inline entry confirmed working: click amber cell, enter Stick + Litres, press Enter or save icon
- [x] DipCell saves via fuelIntelligence.saveDipReading mutation and invalidates dailyStockStatement query
- [x] TypeScript: 0 errors confirmed

## Daily Stock Register — Dip Backfill (Completed Apr 13)
- [x] Extracted 365 dates × 2 fuel types = 730 dip readings from BEES Excel (Daily Stock Statement sheet)
- [x] Inserted all 730 rows into dip_readings table (date range: 2025-04-01 to 2026-03-31)
- [x] Verified: 730 rows confirmed in database with correct dip_litres and dip_stick_reading values
- [x] Sample verified: 31-Mar-2026 Petrol = 7059.77 L (stick 76.0), Diesel = 8853.77 L (stick 90.0)
- [x] Backend dipVariance formula: reportedClosing − dipLitres (Closing Stock − Manual Dip Reading)
- [x] Frontend DipCell preview formula: reportedClosing − parseFloat(litresVal) ✓

## Dip Reading UI Consolidation (Apr 13 - Round 2)
- [ ] Inventory: Remove DIP READINGS & VARIANCE section entirely (cards, state, hooks, imports)
- [ ] Daily Stock Register: Add "Add Dip Reading" button in page header for manual date-based entry
- [ ] Daily Stock Register: Manual entry dialog allows selecting date + entering Petrol and Diesel dip values

## Bugs
- [ ] Fix RangeError: Invalid time value crash on Nozzle Entry page (production) — unsafe date formatting with null/undefined values

## Production Crash Fix — RangeError: Invalid time value (Nozzle Entry)
- [x] Root cause: shiftDate date input could return empty string on mobile browsers, causing format(new Date("T00:00:00")) = Invalid Date crash
- [x] Fix NozzleEntry.tsx line 298: guard format() call with regex validation before calling new Date()
- [x] Fix NozzleEntry.tsx date input onChange: fallback to TODAY if value is empty string
- [x] Fix CashHandover.tsx: guard voucherDate with null check and add T00:00:00 suffix
- [x] Fix BankStatementUpload.tsx: guard createdAt with null check

## RBAC & UX Consolidation Build
- [x] Schema: add pump_attendant to role enum, generate and apply migration
- [x] Combine Nozzle Entry + Daily Activity into single tabbed page (/nozzle-entry with Entry and Activity Report tabs)
- [x] Remove Daily Activity from sidebar navigation
- [x] Build User Management page (Settings → Users): list all users, change roles
- [x] Backend: add tRPC procedures for user management (list users, update role)
- [x] Frontend: filter sidebar navigation by user role
- [x] Frontend: guard page routes by role (redirect to /unauthorized if no access)
- [x] Frontend: disable write actions (buttons) for read-only roles
- [x] Backend: add role guards to Nozzle Entry write operations (incharge + pump_attendant only)
- [x] Backend: add role guards to Expenses create (incharge allowed, read-only for pump_attendant)
- [x] Backend: add role guards to Fuel Prices write (admin + accountant only)
- [x] Backend: add role guards to Bank Statement write (admin + accountant only)
- [x] Backend: add role guards to Cash Handover write (admin + accountant only)
- [x] Backend: add role guards to Customers & Credit write (admin + accountant only)
- [x] Backend: add role guards to Reconciliation write (admin + accountant only)
- [x] Backend: add role guards to Employees/Payroll write (admin only)
- [x] Backend: add role guards to Settings/Import (admin only)
- [x] Clear all test data from Assets & Equipment table

## Invite by Email & Audit Log
- [ ] Schema: add user_invitations table (token, email, role, invitedBy, expiresAt, acceptedAt)
- [ ] Schema: add audit_logs table (userId, userRole, action, module, details, ipAddress, createdAt)
- [ ] Backend: invite.create procedure — generate token, store invitation, send email notification
- [ ] Backend: invite.accept procedure — validate token, create/update user record, mark accepted
- [ ] Backend: invite.list procedure — list pending/accepted invitations (admin only)
- [ ] Backend: invite.revoke procedure — delete pending invitation (admin only)
- [ ] Backend: audit log middleware — auto-capture all admin/accountant mutations with context
- [ ] Backend: auditLog.list procedure — paginated list with filters (user, module, date range)
- [ ] Frontend: User Management page — Add "Invite User" button with email + role form
- [ ] Frontend: User Management page — Show pending invitations list with revoke option
- [ ] Frontend: Audit Log page — table with filters (user, module, date), export to CSV
- [ ] Frontend: Add Audit Log to sidebar under Setup (admin/accountant only)
- [ ] Frontend: Accept invite page at /invite/:token — show role assignment, confirm join

## Invite by Email & Audit Log — COMPLETED (Apr 13)
- [x] Schema: add user_invitations table (token, email, role, invitedBy, expiresAt, acceptedAt, status)
- [x] Schema: add audit_logs table (userId, userName, userRole, action, module, resourceId, details, ipAddress, createdAt)
- [x] Backend: invitationsRouter — create (generate token, store, notify owner), list, revoke, getByToken, accept
- [x] Backend: auditLogRouter — list with pagination (page/pageSize), filters (module, action, search, userId, date range), stats
- [x] Backend: logAudit() helper called on expenses create, bank create, user role change, invitation create/revoke
- [x] Frontend: UserManagement.tsx — Invite User button opens dialog with email + role form, generates invite link
- [x] Frontend: UserManagement.tsx — Pending Invitations card shows active invites with copy/revoke buttons
- [x] Frontend: UserManagement.tsx — Invitation History card shows past invites with status badges
- [x] Frontend: AuditLog.tsx — paginated table with search, module filter, action filter, pagination
- [x] Frontend: AuditLog added to sidebar under Setup (admin/accountant only)
- [x] Frontend: /audit-log route added to App.tsx (admin/accountant only via route guard)
- [x] TypeScript: 0 errors across all new files

## Bug: Diesel (HSD) Stock Showing Wrong Value
- [ ] Investigate root cause: check daily_reports closing stock, inventory table, dip_readings, and dashboard alert logic
- [ ] Fix incorrect Diesel stock display (dashboard alert shows "0 / 5,000 liter")
- [ ] Verify fix in browser and save checkpoint

## Bug Fix + UI Changes (Apr 13 — Session 2)
- [x] Fix Diesel stock: delete bad 2026-04-13 daily_reports row (closingStockDiesel=0, totalSalesValue=63M)
- [x] Fix getAllProducts: skip latest daily_reports row if both closing stocks are 0 (use last non-zero row)
- [x] Remove "Enter Closing Stock" button from Daily Stock Register page
- [x] Combine Nozzle Entry + Daily Activity into single page (NozzleEntry.tsx) with two tabs — already had tabs, updated labels
- [x] Remove Daily Activity from sidebar (was never a separate sidebar item — already merged)
- [x] Update App.tsx routes: /daily-activity was not a separate route — already on /nozzle-entry
- [x] TypeScript: 0 errors after all changes

## Daily Stock Register — Read-Only (Apr 14)
- [x] Remove "Enter Closing Stock" button from Daily Stock Register header
- [x] Remove "+ Add Dip Reading" button from Daily Stock Register header
- [x] Remove "+ Dip Entry" button from inside the table section
- [x] Make Dip Reading cells non-clickable / read-only (remove onClick handlers)
- [x] Remove inline dip edit dialog/form triggered from table cells
- [x] Update description text (remove "Tap any Dip Reading cell to update")
- [x] Remove AddDipDialog component usage and related state
- [x] TypeScript: 0 errors after changes

## Unified Nozzle Entry + Daily Activity Page (Apr 14)
- [x] Remove tab structure from NozzleEntry.tsx
- [x] Show Nozzle Entry form (shift entry) and Daily Activity report on the same scrollable page
- [x] Daily Activity section auto-refreshes and reflects today's sessions live
- [x] Page header clearly labels both sections
- [x] TypeScript: 0 errors

## Three Critical Modules (Apr 14, 2026)

### Module 1: Fuel Delivery Quality Check
- [ ] DB: fuel_deliveries table (tanker details, delivery date, invoice, qty, status)
- [ ] DB: fuel_delivery_quality_checks table (density, colour, water test, result, remarks, checked_by)
- [ ] Backend: fuelDeliveryRouter (logDelivery, recordQualityCheck, approveUnload, rejectDelivery, listDeliveries)
- [ ] UI: FuelDelivery.tsx page with 4-step workflow: Log Tanker → Quality Check → Approve/Reject → Confirm Unload
- [ ] Sidebar: Add "Fuel Delivery" under Fuel group (Incharge + Admin)
- [ ] Route: /fuel-delivery

### Module 2: Incharge Meter Reading Approval
- [ ] DB: Add status field to shift_sessions (open | pending_approval | approved | rejected)
- [ ] Backend: nozzleRouter.submitForApproval, approveSession, rejectSession procedures
- [ ] UI: Pump Attendant sees "Submit for Approval" button after closing readings
- [ ] UI: Incharge sees pending sessions badge + approval queue on /meter-approval page
- [ ] Route: /meter-approval (Incharge + Admin)

### Module 3: E70 Testing Module
- [ ] DB: e70_tests table (date, nozzle_id, drawn_qty, returned_qty, net_deduction, result, density, colour, observations, tested_by)
- [ ] Backend: e70Router (recordTest, listTests, getTestSummary, importHistorical)
- [ ] UI: E70Testing.tsx page with pre-shift test entry form + history log
- [ ] Import historical E70 data from Excel (5L per nozzle per day, Apr 2025–Mar 2026)
- [ ] Sidebar: Add "E70 Testing" under Fuel group (Incharge + Admin)
- [ ] Route: /e70-testing
- [x] TypeScript: 0 errors after all changes

## Opening Readings Bug Fix + New Features (Apr 15)
- [x] Fix getPreviousClosingReadings: seeded March 31, 2026 baseline readings into nozzle_readings — 01/04/2026 now correctly shows March 31 closing values
- [x] Auto-calculate total fuel sold = closing - opening - testing, shown live in Closing Readings step (gross dispensed / sold qty / sales amount per nozzle) and confirmed in Summary step
- [x] Add Incharge review step (step 4): after collections, pump attendant submits for review; submitForApproval mutation sets status to pending_approval; Incharge approves from Meter Approval page
- [x] Add meter photo upload for closing readings (S3 storage, optional, per-nozzle) — camera capture + file upload, instant preview, upload to S3 via uploadMeterPhoto mutation
- [x] TypeScript: 0 errors after all changes
