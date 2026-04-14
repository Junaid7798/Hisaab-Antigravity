Hisaab — Complete Product Evolution Plan
Version 3.0 | Last Updated: 2026-04-14
Expanding from a clinic-only billing tool into a best-in-class, general-purpose SME billing & accounting platform.

1. Competitive Research & Market Analysis
Tier 1: Digital Ledger Apps (Khatabook, OkCredit)
What They Do Well	What They Lack
Dead-simple Udhar/Jama tracking	No invoicing, no inventory, no GST compliance
WhatsApp/SMS payment reminders	No reports beyond basic ledger
Multi-language, mobile-first UX	Cannot scale to real accounting needs
Tier 2: Comprehensive Billing Apps (Vyapar, myBillBook)
What They Do Well	What They Lack
GST invoicing with HSN/SAC codes	Clunky, slow UI for high-volume retail
Inventory with low-stock alerts & barcodes	Buggy automation (reminders sent after payment)
Purchase Orders, Estimates, E-way bills	No intelligence layer (just raw reports)
35+ report types, Profit & Loss, Balance Sheet	No anomaly detection; garbage-in-garbage-out
Tier 3: Enterprise Software (TallyPrime, Zoho Books)
What They Do Well	What They Lack
Gold-standard accounting & CA compatibility	Extremely steep learning curve
Multi-user, multi-location, audit trails	Expensive for micro-businesses
Bank reconciliation, GSTR filing	Not approachable for non-accountant owners
2. Gap Analysis — What Hisaab Has vs. What It Needs
✅ What We Already Have (Strengths)
Offline-first PWA architecture (IndexedDB via Dexie.js)
Solid GST calculation engine (CGST/SGST/IGST)
Multi-business / Multi-tenancy support
Theme engine (light/dark mode)
i18n (English, Hindi, Marathi)
Command palette (Cmd+K)
PDF invoice export
Chart.js analytics
Data backup/restore/wipe
❌ Critical Gaps (Must Fix)
#	Gap	Impact	Priority
1	Clinic-only terminology — "Patient", "Clinic" hardcoded everywhere	Repels 95% of target businesses	🔴 Critical
2	No product/item catalog — items typed manually per invoice	Slow billing, no stock tracking	🔴 Critical
3	No payment ledger — only PAID/UNPAID/PARTIAL status	Cannot track partial payments, methods, or dates	🔴 Critical
4	No supplier/vendor management — only customer-side exists	Cannot track purchases, stock inflow, or payables	🟡 High
5	No purchase orders — buying process is completely untracked	No procure-to-pay workflow	🟡 High
6	No estimates/quotations — no pre-sales documents at all	Lost sales; can't quote before billing	🟡 High
7	No credit/debit notes — no way to handle returns or adjustments	GST non-compliance for returns	🟡 High
8	No recurring invoices — no subscription/repeat billing	Manual re-entry for recurring services	🟢 Medium
9	No WhatsApp/sharing integration — invoice stuck inside app	#1 requested feature in India market	🟡 High
10	No multi-user/staff access — single user only	Owners can't delegate billing to staff	🟢 Medium
11	No barcode/QR scanning — manual item lookup only	Slow for retail environments	🟢 Medium
12	Expense categories are generic — no personalization by business	Irrelevant categories reduce adoption	🟢 Medium
13	No onboarding flow — user lands on empty dashboard	High drop-off; no personalization hook	🔴 Critical
3. Deep Market Research — Competitor Pain Points & Unmet Needs
What Real Users Complain About (from G2, MouthShut, Reddit)
Vyapar: "Too many clicks to generate a single bill. I have a queue of 10 customers and the app is slowing me down."
Vyapar: "The WhatsApp reminder sent 'balance due ₹0' to a customer who just paid. Embarrassing."
Khatabook: "I outgrew it in 3 months. It cannot generate a proper GST invoice."
All apps: "I don't understand the P&L report. Just tell me if I'm making money or not."
All apps: "I typed ₹50,000 instead of ₹5,000 and my monthly report was ruined. Why didn't the app warn me?"
The Intelligence Gap (The Biggest Unmet Need)
Current software is retrospective (it shows you what happened). Zero software is proactive (it warns you what's about to happen). This is our single biggest opportunity:

Cash flow warnings ("You'll run out of operating cash in 12 days at current spend rate")
Anomaly detection ("This expense is 5x your usual for Rent")
Collection nudges ("3 invoices totaling ₹1.2L are overdue by 30+ days")
4. The "Leapfrog" Strategy — Our USPs
USP 1: Personalized Onboarding (110 Business Types)
No competitor does this. Users select their business type during onboarding, and the entire app adapts:

Terminology changes (Patient → Customer → Student → Client)
Dashboard metrics contextualize (e.g., "Appointments" for clinics, "Orders" for retail)
Expense categories pre-populate with industry-relevant defaults
Invoice templates adjust (Service invoice vs. Product invoice)
Sidebar navigation items reorder by relevance
USP 2: "Zen Mode" Fast Billing
A dedicated, 100% keyboard-navigable POS view designed for speed:

F2 → Search/scan item by name or barcode
↓/↑ → Navigate items, Enter → Add to cart
F8 → Apply discount, F12 → Save & Print
Total time to bill a customer: under 8 seconds
Zero mouse movement required
USP 3: AI-Powered Smart Feed
Replace complex charts with plain-language business health cards:

"⚠️ You have ₹45,000 trapped in unpaid invoices older than 30 days."
"📈 Your transport expenses jumped 40% this week vs. last week."
"💰 At your current collection rate, you'll clear all dues by May 12."
"🔴 Stock Alert: 'Paracetamol 500mg' will run out in ~3 days."
USP 4: Smart Data Validation & Anomaly Detection
Flag expenses 300%+ above category average before saving
Warn if duplicate invoice is being created for same customer/date
Alert if a negative-margin item is being billed (selling below cost)
USP 5: Premium "Applesque" Aesthetics
Fluid glassmorphism UI with micro-interactions
Flawless dark mode (not an afterthought)
Animated transitions, skeleton loaders, haptic-feel interactions
The app should feel like a $200/month SaaS, not a free utility
5. Complete Expansion Roadmap
Phase 1: Dynamic Personalization & Onboarding
Goal: Make the app universal. Any business type feels at home.

Build /onboarding screen: Tax Registration Type (GST Registered / Composition / Unregistered) + Business Category grid (110 types, grouped into ~15 sectors)
Create terminology.ts engine — maps business category → domain-specific labels:
Medical → Patients, Prescriptions
Retail → Customers, Orders
Freelance → Clients, Projects
Education → Students, Fees
Add business_category, tax_registration_type, and industry_sector to businesses DB table
Create category-defaults.ts — pre-populated expense categories, common inventory items, and invoice template per business type
Bind all UI (Sidebar labels, Dashboard headers, Table columns, Empty state text) to the terminology engine reactively
Store config on first run; allow changing later from Settings
Phase 2: Inventory & Catalog System
Goal: Transform billing from "type everything" to "search and click".

New DB table: products (id, business_id, name, sku, hsn_sac, unit, selling_price, purchase_price, tax_rate, stock_quantity, low_stock_threshold, is_service, is_deleted, ...)
Build /inventory screen with:
Product list with search, filter by category, sort by stock level
Add/Edit product modal
Low-stock badges (red for critical, amber for warning)
Bulk import from CSV/Excel
Update Invoice Builder:
Searchable product dropdown (fuzzy search by name or SKU)
Auto-fill rate, HSN, tax % when product selected
Auto-deduct stock quantity on invoice save
Show "in stock" count next to each item during selection
Track cost price vs. selling price for margin calculations
Phase 3: Robust Payment Tracking & Ledgers (The "Khata")
Goal: Become the digital bahi-khata. Track every rupee in and out.

New DB table: payments (id, business_id, customer_id, invoice_id (nullable), amount, payment_date, payment_method (Cash/UPI/Bank/Cheque/Other), reference_number, notes, is_deleted, ...)
Customer Ledger View (/customers/[id]):
Running balance: Total Invoiced − Total Paid = Outstanding
Chronological timeline of invoices and payments interleaved
"Record Payment" button to log payment against specific invoices or as advance
Partial Payment handling:
On invoice creation, optionally record upfront payment amount + method
Auto-calculate remaining due
Invoice status auto-updates: UNPAID → PARTIAL → PAID based on payment sum
Payment method analytics on Reports page (pie chart: Cash vs UPI vs Bank)
Phase 4: Suppliers & Purchase Orders
Goal: Track the buy-side, not just the sell-side.

New DB table: suppliers (mirrors customers structure — id, business_id, name, gstin, phone, address, state_code, ...)
New DB table: purchase_orders (id, business_id, supplier_id, po_number, order_date, status (DRAFT/ORDERED/RECEIVED/CANCELLED), total, ...)
New DB table: purchase_order_items (mirrors invoice_items)
Build /suppliers list screen and /suppliers/[id] profile
Build /purchases/new — Purchase Order builder (similar UX to Invoice Builder)
When PO is marked "Received", auto-increment stock quantities in products
Supplier Ledger: Total purchased − Total paid to supplier = Payable
Phase 5: Estimates, Credit Notes & Document Lifecycle
Goal: Support the full sales document workflow.

Add document_type field to invoices: INVOICE | ESTIMATE | PROFORMA | CREDIT_NOTE | DEBIT_NOTE
Estimates:
Create estimates that don't affect revenue metrics
One-click "Convert to Invoice" flow (copies all data, generates new invoice number)
Track conversion rate (estimates → invoices) for analytics
Credit Notes:
Link to original invoice
Auto-adjust customer ledger balance
Reduce stock count (return to inventory)
GST-compliant fields (original invoice reference, reason for note)
Debit Notes:
Same structure, increases the invoice value
Proforma Invoices:
Non-tax document for advance payment requests
Phase 6: Sharing, Communication & Reminders
Goal: Get invoices to customers instantly. Collect money faster.

WhatsApp Sharing: "Share via WhatsApp" button on every invoice — opens WhatsApp with pre-filled message + PDF attachment via Web Share API
Email Sharing: "Send via Email" using mailto: deep link with attached invoice summary
Smart Payment Reminders:
User can set reminder frequency per customer (Weekly / Bi-weekly)
System generates a reminder list: "These 5 customers are overdue. Send reminders?"
One-click bulk reminder via WhatsApp (no auto-send — user always confirms first, fixing the Vyapar "dumb automation" problem)
UPI QR Code on Invoice: Auto-generate UPI payment QR code on printed/PDF invoices for instant payment
Phase 7: Recurring Invoices & Subscriptions
Goal: Automate repeat billing for subscription/service businesses.

New DB table: recurring_schedules (id, business_id, customer_id, template_invoice_id, frequency (WEEKLY/MONTHLY/QUARTERLY/YEARLY), next_run_date, is_active, ...)
When a recurring schedule fires (checked on app open), auto-generate a new invoice from the template
Dashboard notification: "3 recurring invoices were auto-generated today. Review them."
Manage recurring schedules from the customer profile
Phase 8: Multi-User & Staff Access (Future/Cloud)
Goal: Let the owner delegate billing to staff with controlled access.

Requires Supabase auth integration (already scaffolded in owner_id fields)
Role-Based Access Control (RBAC):
Owner: Full access to everything
Manager: Can create invoices, manage inventory, view reports. Cannot change settings or delete data.
Billing Staff: Can only create invoices and record payments. Cannot view reports or modify products.
View-Only: Can view reports and ledgers. Cannot create or edit anything.
Activity audit log: track who created/modified what and when
Phase 9: The Intelligence Layer (Smart Feed & Anomalies)
Goal: Be the only billing app that actually thinks for its users.

Smart Feed on Dashboard — plain-language cards:
Overdue invoice warnings with total amounts
Expense spike detection (week-over-week comparison)
Cash flow projections (revenue trends vs. expense trends)
Stock depletion predictions ("Paracetamol will run out in ~3 days")
Best-selling products and peak billing hours
Input Validation & Anomaly Detection:
Flag expenses 300%+ above historical category average
Warn on duplicate invoices (same customer + same date + similar amount)
Alert when selling below cost price (negative margin detection)
Suggest frequently-used items when creating new invoices
Business Health Score: A single 0-100 number summarizing overall health based on:
Collection ratio (% of invoices paid on time)
Expense discipline (variance from averages)
Stock health (% of items above low-stock threshold)
Phase 10: Premium UX & Performance Polish
Goal: The app should feel like a $200/month premium SaaS product.

Zen Mode POS: Full-screen, keyboard-first billing interface
Keyboard shortcut overlay (press ? to see all shortcuts)
Sound feedback on scan/add item (optional)
Receipt preview in real-time as items are added
Barcode Scanner Integration: Use device camera via Web API for product lookup
Bulk Operations: Multi-select invoices for bulk status change, bulk PDF export, bulk WhatsApp share
Advanced Search: Global search across customers, invoices, products, and expenses from the command palette
Skeleton Loaders: Extend to all list views (currently only Dashboard)
Mobile Responsiveness Audit: Ensure every screen works flawlessly on 360px-width screens
PWA Install Prompt: Custom, beautiful "Add to Home Screen" prompt
Onboarding Tour: Guided walkthrough for first-time users after onboarding selection
6. Logical Dependency Map
NOTE

Phases must respect these dependencies. You cannot build Phase 3 properly without Phase 2.

Phase 1: Personalization
Phase 2: Inventory
Phase 3: Payment Ledgers
Phase 4: Suppliers & POs
Phase 5: Estimates & Credit Notes
Phase 6: Sharing & Reminders
Phase 7: Recurring Invoices
Phase 8: Multi-User
Phase 9: Intelligence Layer
Phase 10: Premium UX Polish
7. Database Schema Evolution Summary
Phase	New Tables	Modified Tables
1	—	businesses (+business_category, tax_registration_type, industry_sector)
2	products	invoice_items (+product_id FK)
3	payments	invoices (status now computed from payments)
4	suppliers, purchase_orders, purchase_order_items	products (+stock adjustment on PO receive)
5	—	invoices (+document_type, linked_invoice_id)
7	recurring_schedules	—
8	users, roles, activity_log	All tables (+created_by field)
User Review Required
IMPORTANT

This is the comprehensive, gap-free roadmap.

Key improvements over the previous version:

Added Phases 4, 6, 7, 8 which were completely missing before
Added Supplier/Vendor management and Purchase Orders (buy-side tracking)
Added Credit/Debit Notes for GST-compliant returns handling
Added WhatsApp sharing and smart reminders (fixes the #1 competitor complaint)
Added Recurring invoices for subscription businesses
Added Multi-user RBAC for staff delegation
Added Barcode scanner and UPI QR code generation
Added Logical dependency map so phases execute in correct order
Added DB schema evolution table so we never lose track of migrations
Fixed the personalization depth: not just terminology, but also default categories, invoice templates, and dashboard widgets per business type
Ready to begin execution when you approve. Recommended start: Phase 1 (Personalization & Onboarding).


Hisaab — Product Evolution Task Tracker
Phase 1: Dynamic Personalization & Onboarding
 Update Dexie schema v2: Add business_category, tax_registration_type, industry_sector to businesses
 Build /onboarding screen (Tax Type toggle + Business Category grid with 110 types in ~15 groups)
 Create terminology.ts — dynamic label engine mapping business type → domain terms
 Create category-defaults.ts — pre-populated expense categories, common items, and invoice template per business type
 Refactor all UI (Sidebar, Dashboard headers, Table columns, Empty states) to use terminology engine
 Allow changing business type from Settings
 Redirect new users to /onboarding before /dashboard
Phase 2: Inventory & Catalog System
 New DB table: products (name, SKU, HSN, unit, selling_price, purchase_price, tax_rate, stock_quantity, low_stock_threshold, is_service)
 Build /inventory screen — product list with search, filter, sort, low-stock badges
 Build Add/Edit product modal
 Update Invoice Builder: searchable product dropdown, auto-fill rate/HSN/tax
 Auto-deduct stock on invoice save
 Show in-stock count during item selection
 Bulk import products from CSV/Excel
Phase 3: Payment Tracking & Ledgers (The "Khata")
 New DB table: payments (customer_id, invoice_id, amount, date, method, reference, notes)
 Customer Ledger View: running balance (Invoiced − Paid = Outstanding)
 Chronological timeline of invoices + payments interleaved
 "Record Payment" button on customer profile and invoice detail
 Partial payment handling on invoice creation
 Auto-update invoice status (UNPAID → PARTIAL → PAID) based on payment sum
 Payment method analytics on Reports page
Phase 4: Suppliers & Purchase Orders
 New DB table: suppliers (mirrors customer structure + GSTIN)
 New DB tables: purchase_orders, purchase_order_items
 Build /suppliers list and /suppliers/[id] profile
 Build /purchases/new — Purchase Order builder
 Auto-increment stock when PO marked "Received"
 Supplier Ledger: Total purchased − Total paid = Payable
Phase 5: Estimates, Credit Notes & Document Lifecycle
 Add document_type field to invoices (INVOICE / ESTIMATE / PROFORMA / CREDIT_NOTE / DEBIT_NOTE)
 Build Estimate creation flow (non-revenue impacting)
 One-click "Convert Estimate to Invoice" flow
 Credit Note creation with original invoice reference
 Auto-adjust customer ledger on credit/debit note
 Handle stock return on credit notes
 Track estimate → invoice conversion rate in analytics
Phase 6: Sharing, Communication & Reminders
 "Share via WhatsApp" button using Web Share API
 "Send via Email" using mailto deep link
 Smart Payment Reminders — generate overdue list, one-click bulk WhatsApp (user confirms, no auto-send)
 UPI QR Code auto-generation on printed/PDF invoices
Phase 7: Recurring Invoices & Subscriptions
 New DB table: recurring_schedules (customer_id, template_invoice_id, frequency, next_run_date, is_active)
 Auto-generate invoices from templates on app open
 Dashboard notification for auto-generated invoices
 Manage recurring schedules from customer profile
Phase 8: Multi-User & Staff Access (Cloud-dependent)
 Integrate Supabase auth for user accounts
 RBAC roles: Owner, Manager, Billing Staff, View-Only
 Activity audit log (who created/modified what and when)
 Role-based UI: hide/show features based on user role
Phase 9: Intelligence Layer (Smart Feed & Anomalies)
 Smart Feed dashboard cards (overdue warnings, expense spikes, cash flow projections)
 Stock depletion predictions
 Input validation: flag expenses 300%+ above category average
 Duplicate invoice detection (same customer + date + similar amount)
 Negative margin alert (selling below cost price)
 Business Health Score (0-100 composite metric)
Phase 10: Premium UX & Performance Polish
 Zen Mode POS: full-screen keyboard-first billing interface
 Keyboard shortcut overlay (press ?)
 Barcode scanner via device camera (Web API)
 Bulk operations: multi-select invoices for status change, PDF export, WhatsApp share
 Advanced search across all entities from command palette
 Extend skeleton loaders to all list views
 Mobile responsiveness audit (360px minimum)
 Custom PWA install prompt
 Guided onboarding tour for first-time users


# Hisaab — Full Codebase Audit Report

## 🔴 Critical Bugs (Will Crash or Corrupt Data)

### 1. Syntax Error in `crud.ts` — Extra Closing Brace
**File:** [crud.ts](file:///d:/Hisaab/src/lib/db/crud.ts#L302)
**Line 302** has a stray `}` that closes the function body prematurely. The `getExpensesByMonth` function has an extra `}` before `return result;`.

```diff
-	}
 	return result;
 }
```

This is a **runtime crash** — the function fails on every call and the Reports page likely breaks entirely.

---

### 2. `createBusiness` Missing New Fields
**File:** [crud.ts](file:///d:/Hisaab/src/lib/db/crud.ts#L6-L25)

`createBusiness()` does NOT assign `business_category`, `tax_registration_type`, or `industry_sector`. These fields exist on the `Business` interface but are silently `undefined` when a business is created via Settings (the `else` branches at lines 117–143 call `createBusiness` with those fields, but `createBusiness` spreads `data` AFTER hardcoding defaults — the `id` override works, but the 3 new fields are never read from `data`).

The actual issue: the constructed object doesn't include the 3 fields at all — they're passed in `data` but the function builds a complete object from scratch, only picking specific keys. The new fields are **silently dropped**.

---

### 3. `export.ts` — Backup/Restore Ignores New Tables
**File:** [export.ts](file:///d:/Hisaab/src/lib/utils/export.ts)

`exportDatabaseToJSON()`, `importDatabaseFromJSON()`, and `wipeDatabase()` only handle 5 tables: `businesses, patients, invoices, invoice_items, expenses`. 

**Missing:** `products`, `payments`, `suppliers`, `purchase_orders`, `purchase_order_items`.

If a user backs up and restores, they **lose all inventory and payment data silently**.

---

### 4. `invoice_id` Not Passed to `createPayment` from Patient Ledger
**File:** [patients/[id]/+page.svelte](file:///d:/Hisaab/src/routes/%28app%29/patients/%5Bid%5D/+page.svelte#L56-L67)

When recording a payment from the customer profile, `invoice_id` is never set. The payment is "orphaned" — it won't appear in `getPaymentsByInvoice()` queries, so the invoice detail page won't reflect it.

---

## 🟠 Logic Gaps (Functionally Wrong)

### 5. Outstanding Calculation on Dashboard Uses Old Logic
**File:** [crud.ts — getOutstandingTotal](file:///d:/Hisaab/src/lib/db/crud.ts#L174-L181)

The dashboard's "Outstanding Payments" card uses `getOutstandingTotal()` which sums `grand_total` of all non-PAID invoices. But with partial payments now possible, the *actual* outstanding is `grand_total - sum(payments)`. A ₹10,000 invoice with ₹8,000 paid still shows ₹10,000 outstanding on the dashboard.

### 6. Patient Ledger Payment-to-Invoice Matching is Oversimplified
**File:** [patients/[id]/+page.svelte](file:///d:/Hisaab/src/routes/%28app%29/patients/%5Bid%5D/+page.svelte#L69-L83)

The algorithm compares `remainingAmt >= inv.grand_total` to decide PAID vs PARTIAL. But it doesn't account for:
- Previous partial payments already applied to that invoice
- The actual outstanding per-invoice (should be `grand_total - existing_payments`)

This means recording a second partial payment can incorrectly mark an invoice PAID.

### 7. `handleProductSelect` Doesn't Trigger on Datalist Selection
**File:** [invoices/new/+page.svelte](file:///d:/Hisaab/src/routes/%28app%29/invoices/new/+page.svelte#L268)

The `oninput` event fires on every keystroke, but when a user clicks a datalist option, the browser fills the input *then* fires `input`. However, `item.description` in Svelte's bind may not yet reflect the selected value at the time `oninput` fires. The product matching check at line 73 (`products.find(p => p.name === value)`) receives the old value. A `onchange` event or a `setTimeout` is needed for reliable datalist selection.

### 8. `$effect` Infinite Loop Risk in Invoice Builder
**File:** [invoices/new/+page.svelte](file:///d:/Hisaab/src/routes/%28app%29/invoices/new/+page.svelte#L56-L60)

`$effect` calls `loadInvoiceContext` which mutates `businessId`, `patients`, `products`, etc. If any of those reactive values are accidentally tracked by Svelte 5's fine-grained reactivity, this could trigger re-runs. Should use `$effect` with `untrack` or `onMount`.

### 9. Negative Stock Allowed
**File:** [invoices/new/+page.svelte](file:///d:/Hisaab/src/routes/%28app%29/invoices/new/+page.svelte#L149-L160)

Stock deduction has no floor check. If a user bills 100 units when only 50 are in stock, the stock goes to -50. There's no warning or prevention.

---

## 🟡 Minor Issues & Polish

### 10. Hardcoded Clinic-Specific Strings Still Present
| File | String |
|------|--------|
| `helpers.ts:168` | `EXPENSE_CATEGORIES` hardcoded as "Medical Supplies", etc. |
| `helpers.ts:153` | `MEDICAL_SAC_CODES` — only medical SAC codes |
| `settings/+page.svelte:214` | Placeholder `clinic@email.com` |
| `settings/+page.svelte:311` | "Save all clinic data as a JSON file" |
| `settings/+page.svelte:337` | "Permanently delete all clinic data" |
| `invoices/new:244` | Icon `medical_services` hardcoded |

### 11. Unused Import
**File:** `patients/[id]/+page.svelte:11` — `getInvoice` is imported but never used.

### 12. `sendEmail` Checkbox Does Nothing
**File:** [invoices/new/+page.svelte:37,391](file:///d:/Hisaab/src/routes/%28app%29/invoices/new/+page.svelte#L37)  
The "Send Email" checkbox exists but is never acted upon.

### 13. Invoice `patient_id` Query Param Not Read
**File:** `invoices/new` — The "New Invoice" link from patient profile passes `?patient_id=...` but the page never reads `$page.url.searchParams` to pre-select that patient.

---

## 🟢 Improvement Roadmap (Impact-Ranked)

### Tier 1 — High Impact, Must Fix
| # | Feature | Impact |
|---|---------|--------|
| A | **Fix all 4 critical bugs above** | Prevents data loss and crashes |
| B | **Due date separate from issue date** | Currently `due_date = issueDate` always — no credit terms |
| C | **WhatsApp / Share invoice** | #1 requested feature for Indian SMEs |
| D | **Dashboard should show payment-aware outstanding** | Current metric is misleading |

### Tier 2 — High Impact, New Features
| # | Feature | Impact |
|---|---------|--------|
| E | **Customer search on invoice page** | With 100+ customers, dropdown is unusable |
| F | **Duplicate / clone invoice** | Speed up repeat billing |
| G | **Invoice edit** | Currently you can only create, never edit |
| H | **Expense categories from terminology engine** | Categories should match business type |
| I | **Stock warnings during invoice creation** | Show "Only X left" badge near quantity |

### Tier 3 — Polish & Delight
| # | Feature | Impact |
|---|---------|--------|
| J | **Running balance column in ledger** | Show cumulative balance at each event |
| K | **Delete product / payment confirmation dialog** | No soft-delete UI exists for products |
| L | **Invoice PDF includes payment history** | Show "Payments received" section |
| M | **Empty state illustrations** | Current empty states are text-only |
| N | **Onboarding re-accessible from Settings** | If user wants to re-do the guided setup |

### Tier 4 — Competitive Differentiators
| # | Feature | Impact |
|---|---------|--------|
| O | **UPI QR code on invoice** | Auto-generate from UPI VPA |
| P | **Recurring invoice templates** | Monthly subscription businesses |
| Q | **Multi-currency support** | Freelancers billing internationally |
| R | **Barcode/QR scanner for products** | Retail & pharmacy speed |
| S | **Profit & Loss report** | Revenue - COGS - Expenses = Profit |

---

## Summary

> [!CAUTION]
> **4 critical bugs** need immediate attention — the stray brace in `crud.ts` will crash the Reports page, the export utility silently drops new tables, `createBusiness` drops new fields, and orphaned payments won't appear on invoices.

> [!IMPORTANT]
> The outstanding calculation on the dashboard is misleading now that partial payments exist. This is a trust issue — users rely on this number.

I recommend fixing the 4 critical bugs first, then tackling Tier 1 improvements. Want me to start fixing them?
