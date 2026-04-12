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
