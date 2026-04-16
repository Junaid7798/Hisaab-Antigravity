# Hisaab — Next-Level Improvement Roadmap

After a thorough audit of every page, component, store, CSS system, and database layer, here are **concrete, actionable improvements** organized by category.

---

## 🎨 1. UI & Visual Polish

### 1.1 — Sidebar Template Bug (CRITICAL)
**File:** `Sidebar.svelte` (lines 126–165)
**Problem:** The Sidebar has a broken HTML structure — there's a duplicate `<div class="max-h-48">` block and misaligned closing tags causing the `svelte-check` error: `</div> attempted to close an element that was not open`. The entire build fails to type-check because of this.
**Fix:** Restructure the Sidebar template to properly nest the business switcher dropdown.
**Priority:** 🔴 Critical | **Effort:** 30 min

### 1.2 — Missing Page Transition Animations
**Problem:** When navigating between pages (Dashboard → Invoices → Patients), there's an abrupt content swap with no transition. The CSS already defines `.page-enter` animations but they aren't wired into the layout.
**Fix:** Add `in:fly` or `in:fade` transitions to the `(app)/+layout.svelte` main content `<slot>` wrapper.
**Priority:** 🟡 Medium | **Effort:** 15 min

### 1.3 — Toast Notifications Lack Enter/Exit Animations
**File:** `Toast.svelte`
**Problem:** Toasts appear and disappear instantly — no slide-in or fade-out. This feels jarring compared to the rest of the polished UI.
**Fix:** Add `transition:fly={{ y: 50 }}` and `out:fade` to each toast item.
**Priority:** 🟡 Medium | **Effort:** 15 min

### 1.4 — Low Stock Alert Uses Hardcoded Colors
**File:** `dashboard/+page.svelte` (line 185)
**Problem:** The low stock alert card uses `bg-amber-50 text-amber-900 border-amber-200` — hardcoded Tailwind defaults that don't adapt to dark mode, breaking the Material Design system.
**Fix:** Replace with `bg-warning-container text-on-warning-container` using the design tokens already defined in `layout.css`.
**Priority:** 🟢 Low | **Effort:** 5 min

### 1.5 — Settings "Quick Stats" Are Hardcoded
**File:** `settings/+page.svelte` (lines 1086-1097)
**Problem:** The sidebar shows "Invoices Created: 127", "Active Customers: 45", "This Month: ₹2.4L" — all hardcoded placeholder values. They never update with real data.
**Fix:** Query actual counts from the database on mount.
**Priority:** 🟡 Medium | **Effort:** 30 min

### 1.6 — No Favicon or PWA Icons
**File:** `app.html`
**Problem:** No `<link rel="icon">` or PWA manifest icons. The app shows a generic browser icon on the tab and home screen.
**Fix:** Add a favicon and create a `manifest.json` with proper icons for PWA installability.
**Priority:** 🟡 Medium | **Effort:** 45 min

---

## 🧭 2. UX & Interaction Design

### 2.1 — No Confirmation on Delete Operations
**Problem:** `softDeleteExpense`, `softDeleteProduct`, `softDeletePatient` — all delete immediately on click with no confirmation dialog. Only the full "Wipe All Data" has a confirmation.
**Fix:** Add a reusable `ConfirmDialog.svelte` component and wire it to all delete actions.
**Priority:** 🔴 Critical | **Effort:** 1 hour

### 2.2 — No Undo/Recover for Deleted Records
**Problem:** Once a record is soft-deleted, there's no way to recover it from the UI. Users must restore from a backup.
**Fix:** Add a "Recently Deleted" section in Settings or a toast with "Undo" action that restores the record within 10 seconds.
**Priority:** 🟡 Medium | **Effort:** 2 hours

### 2.3 — Tables Not Paginated
**Problem:** Patients, Expenses, Invoices — all tables load the entire dataset. With hundreds of records, scroll performance degrades.
**Fix:** Add pagination (20-50 records per page) or virtual scrolling to all list views.
**Priority:** 🟡 Medium | **Effort:** 2 hours

### 2.4 — No Global Search / Filtering
**Problem:** Only the Patients page has search. Invoices, Expenses, Products, Staff — none have search or date-range filtering.
**Fix:** Add a search bar and date-range filter to each list page. Consider enhancing the `CommandPalette.svelte` to search across all entities.
**Priority:** 🟡 Medium | **Effort:** 3 hours

### 2.5 — No Keyboard Shortcuts on Forms
**Problem:** The invoice creation form has no keyboard shortcuts. Users must click "Add Row", "Save", etc.
**Fix:** Add `Ctrl+Enter` to save/submit, `Ctrl+Shift+N` to add a new line item, `Escape` to cancel.
**Priority:** 🟢 Low | **Effort:** 30 min

### 2.6 — Expenses: No Edit or Delete Capability
**Problem:** The Expenses page only supports creating expenses. There's no way to edit an existing expense or delete one from the UI.
**Fix:** Add an edit modal and delete action to each expense row.
**Priority:** 🔴 Critical | **Effort:** 1.5 hours

### 2.7 — No Loading State on Form Submissions
**Problem:** When creating an invoice or patient, the submit button doesn't show a loading spinner. Users can double-click and create duplicates.
**Fix:** Disable button + show spinner during `saving` state. The invoice form already has a `saving` variable but other forms don't.
**Priority:** 🟡 Medium | **Effort:** 30 min

---

## 📱 3. Responsive Design & Mobile

### 3.1 — Tables Break on Mobile
**Problem:** All tables (invoices, patients, expenses) use `whitespace-nowrap` and horizontal scroll, but on narrow screens the horizontal scroll is hidden and columns are cut off.
**Fix:** Replace tables with card-based layouts on mobile (`<768px`) using responsive breakpoints.
**Priority:** 🟡 Medium | **Effort:** 3 hours

### 3.2 — Mobile "More" Menu Doesn't Work
**Problem:** The bottom nav "More" button toggles `switcherOpen` instead of opening the full navigation drawer. Tapping "More" opens the business switcher, not the remaining nav items.
**Fix:** Separate the "More" button behavior from the business switcher. Show a slide-up sheet with the remaining nav items.
**Priority:** 🔴 Critical | **Effort:** 1 hour

### 3.3 — No Pull-to-Refresh
**Problem:** As a PWA targeting mobile users, there's no pull-to-refresh gesture on the dashboard or list pages.
**Fix:** Add a pull-to-refresh component that calls `loadDashboard(id, true)` with cache invalidation.
**Priority:** 🟢 Low | **Effort:** 1 hour

---

## ⚡ 4. Performance

### 4.1 — Google Fonts Loaded via @import (Render Blocking)
**File:** `layout.css` (lines 2-3)
**Problem:** Two `@import url(...)` calls in CSS block rendering until fonts download. This delays First Contentful Paint.
**Fix:** Move font loading to `<link rel="preload">` in `app.html` with `font-display: swap`.
**Priority:** 🟡 Medium | **Effort:** 15 min

### 4.2 — Material Symbols Full Set Loaded
**File:** `layout.css` (line 3)
**Problem:** The entire Material Symbols Outlined font file (~300KB) is loaded even though only ~40 unique icons are used.
**Fix:** Use the Google Fonts API text subsetting: `&text=dashboard,settings,...` or switch to SVG icon components for the ~40 icons used.
**Priority:** 🟢 Low | **Effort:** 1 hour

### 4.3 — No IndexedDB Size Monitoring
**Problem:** Users have no visibility into how much local storage their data consumes. IndexedDB has a quota (~50-80% of disk on Chrome) and silently fails when full.
**Fix:** Add a "Storage Used" meter to Settings using `navigator.storage.estimate()`.
**Priority:** 🟢 Low | **Effort:** 30 min

---

## 🗄️ 5. Database & Data Integrity

### 5.1 — No Data Migration Strategy
**Problem:** When the Dexie schema changes (adding new fields/tables), there's no version migration handler. Users on older schema versions will get errors.
**Fix:** Add proper Dexie `.version(N).stores({...}).upgrade(...)` migration chains in `index.ts`.
**Priority:** 🔴 Critical | **Effort:** 2 hours

### 5.2 — Payment Links Not Validated
**Problem:** `createPayment` accepts any `invoice_id` without verifying the invoice exists or isn't deleted. Orphan payments are possible.
**Fix:** Add a lookup check before creating payments.
**Priority:** 🟡 Medium | **Effort:** 15 min

### 5.3 — No Audit Trail
**Problem:** There's no history of who changed what and when. If an invoice amount is edited, the old value is lost.
**Fix:** Create an `audit_log` table that records entity type, entity ID, action, old values, new values, and timestamp.
**Priority:** 🟡 Medium | **Effort:** 3 hours

### 5.4 — Recurring Schedule Edge Cases
**Problem:** `processRecurringSchedules` runs on every app load with no debounce. If the user opens multiple tabs, duplicate invoices could be generated.
**Fix:** Add a lock mechanism using a `sync_meta` record with a `last_processed` timestamp.
**Priority:** 🟡 Medium | **Effort:** 1 hour

---

## ♿ 6. Accessibility

### 6.1 — Missing ARIA Labels Throughout
**Problem:** Icon-only buttons (sidebar collapse, close modal, delete) have no `aria-label`. Screen readers announce them as "button" with no context.
**Fix:** Add `aria-label="Close"`, `aria-label="Delete expense"`, etc. to all icon-only interactive elements.
**Priority:** 🟡 Medium | **Effort:** 1 hour

### 6.2 — Color Contrast Issues
**Problem:** Several text elements use `opacity-80` or `text-on-surface-variant/70` which may fail WCAG AA contrast ratios, especially in the `bg-primary` revenue card.
**Fix:** Audit with a contrast checker and adjust opacity values.
**Priority:** 🟢 Low | **Effort:** 30 min

### 6.3 — No Focus Trap in Modals
**Problem:** When a modal is open, Tab key can focus elements behind the modal backdrop. The Modal component doesn't trap focus.
**Fix:** Add focus trapping logic (first/last focusable element cycling) to `Modal.svelte`.
**Priority:** 🟡 Medium | **Effort:** 45 min

---

## 🧩 7. Missing Features

### 7.1 — No Invoice List Page
**Problem:** The sidebar links to `/invoices/new` (create form) but there's no `/invoices` page to browse all invoices. Users can only see the 5 most recent on the dashboard.
**Fix:** Create a full invoice list page with search, date filtering, status filtering, and bulk actions.
**Priority:** 🔴 Critical | **Effort:** 3 hours

### 7.2 — No Expense Receipts/Attachments viewer
**Problem:** The schema supports `receipt_base64` on expenses, but there's no UI to upload or view receipt images.
**Fix:** Add a file upload input and image preview in the expense modal.
**Priority:** 🟡 Medium | **Effort:** 1.5 hours

### 7.3 — No PDF Invoice Export
**Problem:** There's no way to generate a PDF from an invoice. The print view exists but a one-click PDF download is expected.
**Fix:** Use `html2canvas` + `jsPDF` or the browser's `window.print()` with a print-optimized layout.
**Priority:** 🟡 Medium | **Effort:** 2 hours

### 7.4 — No Multi-Currency Support
**Problem:** Currency options exist in settings (USD, EUR, GBP, AED, SGD) but the entire codebase uses `formatINR` exclusively. Selecting a different currency does nothing.
**Fix:** Create a `formatCurrency` function that reads the active currency from preferences and formats accordingly.
**Priority:** 🟢 Low | **Effort:** 2 hours

### 7.5 — No Onboarding / First-Run Experience
**Problem:** When a user opens the app for the first time, they land on an empty dashboard with no guidance. There's no setup wizard or welcome flow.
**Fix:** Create a step-by-step onboarding flow: Business Profile → First Customer → First Invoice.
**Priority:** 🟡 Medium | **Effort:** 3 hours

---

## 🛡️ 8. Security & Reliability

### 8.1 — No App Lock / PIN Protection
**Problem:** All financial data is accessible with no authentication. Anyone who opens the browser can see everything.
**Fix:** Add an optional PIN lock screen that activates when the app is opened or after inactivity.
**Priority:** 🟡 Medium | **Effort:** 2 hours

### 8.2 — No Auto-Backup
**Problem:** Users must manually go to Settings → Download Backup. If they forget and their browser data is cleared, everything is lost.
**Fix:** Add an automatic weekly backup to localStorage or offer cloud backup integration.
**Priority:** 🟡 Medium | **Effort:** 2 hours

### 8.3 — Sync Engine Has No Authentication
**File:** `sync.ts`
**Problem:** The sync engine pushes/pulls without any auth token or user verification. Any client with the business ID could theoretically sync data.
**Fix:** Add token-based auth to sync requests.
**Priority:** 🔴 Critical | **Effort:** 3 hours

---

## Recommended Execution Order

| Phase | Items | Effort | Impact |
|-------|-------|--------|--------|
| **A — Blockers** | 1.1 (Sidebar bug), 2.1 (Delete confirm), 3.2 (Mobile nav), 7.1 (Invoice list) | ~6 hrs | Fixes broken functionality |
| **B — Core UX** | 2.6 (Edit expenses), 1.2 (Page transitions), 1.3 (Toast animation), 2.4 (Search), 2.7 (Loading states) | ~5 hrs | Major usability uplift |
| **C — Data Safety** | 5.1 (Migrations), 8.3 (Sync auth), 8.2 (Auto-backup), 5.4 (Recurring lock) | ~8 hrs | Prevents data loss |
| **D — Polish** | 1.4 (Dark mode colors), 1.5 (Real stats), 4.1 (Font loading), 3.1 (Mobile tables), 6.1 (ARIA) | ~6 hrs | Professional finish |
| **E — Features** | 7.2 (Receipts), 7.3 (PDF export), 7.5 (Onboarding), 2.2 (Undo), 2.3 (Pagination) | ~12 hrs | Feature completeness |

---

> **Total estimated effort: ~37 hours across 35 items.**
> Phases A + B alone (~11 hours) would transform the app from "functional prototype" to "daily-driver quality."
