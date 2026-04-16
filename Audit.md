# Hisaab Enterprise — Comprehensive Fix & Improvement Plan

> Complete action plan to resolve all identified bugs, logic gaps, and architectural weaknesses.
> Covers **34 individual fixes** across **6 prioritized phases**.

---

## User Review Required

> [!CAUTION]
> **Phase 1 (Critical Bug Fixes)** must be executed first — these are data-integrity and crash-level issues that affect every active user.

> [!IMPORTANT]
> **Phase 3 (Sync Engine)** involves changes to the bidirectional sync strategy. If you have any data currently synced to Supabase, we should coordinate a migration window. Please confirm if cloud sync is actively in use.

> [!WARNING]
> **Phase 5 (Zod Validation)** introduces a new dependency (`zod`). This adds ~13KB gzipped to the bundle. Please confirm this is acceptable.

---

## Phase 1: Critical Bug Fixes (Data Integrity & Crashes)
**Risk: 🔴 Critical | Estimated effort: ~2 hours**

These bugs will cause data loss, silent corruption, or runtime crashes. Fix first.

---

### 1.1 — `createBusiness` Silently Drops New Fields

#### [MODIFY] [crud.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/crud.ts)

**Problem:** `createBusiness()` constructs the `Business` object by picking specific keys manually (lines 10–28). The three fields added in Phase 1 of the product evolution (`business_category`, `tax_registration_type`, `industry_sector`) are never read from the `data` parameter — they are silently dropped.

**Impact:** When a new business is created from Settings (line 162: `createBusiness({ id: $activeBusinessId, ...data })`), the business type config is lost. The terminology engine falls back to `medical_clinic`.

**Fix:** Add the three missing fields to the constructed object:
```diff
 const business: Business = {
   id: data.id || generateId(),
   owner_id: data.owner_id || '',
   name: data.name || '',
   gstin: data.gstin || '',
   state_code: data.state_code || '27',
   address: data.address || '',
   phone: data.phone || '',
   email: data.email || '',
   logo_base64: data.logo_base64 || '',
   invoice_counter: data.invoice_counter || 1,
   fy_start: data.fy_start || `${new Date().getFullYear()}-04-01`,
+  business_category: data.business_category || '',
+  tax_registration_type: data.tax_registration_type || 'unregistered',
+  industry_sector: data.industry_sector || '',
   is_deleted: false,
   created_at: now(),
   last_modified: now()
 };
```

---

### 1.2 — Backup/Restore Silently Drops Tables

#### [MODIFY] [export.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/utils/export.ts)

**Problem:** `exportDatabaseToJSON()` exports 11 tables, but `importDatabaseFromJSON()` and `wipeDatabase()` only clear/import through 4 batch functions that cover those 11. However, the following tables added in later phases are **completely missing from all backup/restore/wipe operations**:

- `staff`
- `staff_salaries`
- `staff_advances`
- `staff_documents`
- `attendance`
- `leave_requests`
- `leave_balances`
- `tasks`
- `loans`
- `branches`
- `bom`
- `recurring_schedules`
- `sync_meta`

**Impact:** A user who backs up their data, wipes, and restores will **permanently lose** all HR data, task data, loan records, BOM configurations, and recurring schedule setups. The `wipeDatabase()` function also fails to clear these tables.

**Fix:** 
1. Add all missing tables to `exportDatabaseToJSON()`
2. Add two new batch import functions (`clearAndImportBatch5`, `clearAndImportBatch6`) for the missing tables
3. Wire them into `importDatabaseFromJSON()` and `wipeDatabase()`

---

### 1.3 — Recurring Schedule Uses Invalid `PENDING` Status

#### [MODIFY] [crud.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/crud.ts)

**Problem:** `processRecurringSchedules()` at line 872 sets `status: 'PENDING'` on auto-generated invoices. However, the `Invoice` interface (index.ts line 53) only defines `'PAID' | 'UNPAID' | 'PARTIAL'`. The code bypasses TypeScript by casting `as unknown as Invoice`.

**Impact:** These invoices appear with an undefined status in the UI. The `StatusChip` component may render incorrectly or crash. Dashboard queries that filter on status will silently exclude these invoices.

**Fix:** Change `status: 'PENDING'` → `status: 'UNPAID'` and remove the `as unknown as Invoice` cast.

---

### 1.4 — Invoice Number Mismatch in Recurring Schedules

#### [MODIFY] [crud.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/crud.ts)

**Problem:** `processRecurringSchedules()` generates invoice numbers using a manual format at line 857:
```ts
const invoiceNumber = `${prefix}/${currentYear}/${nextCounter.toString().padStart(4, '0')}`;
```

But the rest of the codebase uses `generateInvoiceNumber()` from `invoice-number.ts`, which generates `INV-{FY}-{COUNTER}` format. This creates inconsistent invoice numbers (e.g., `MED/2026/0042` vs `INV-2526-0042`).

**Fix:** Import and use `generateInvoiceNumber(business.invoice_counter)` from `invoice-number.ts`.

---

### 1.5 — `category-defaults.ts` Has a Typo Bug for `plumber`

#### [MODIFY] [category-defaults.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/utils/category-defaults.ts)

**Problem:** Line 67 has `pipes_fittings` instead of `expenseCategories`:
```ts
plumber: { pipes_fittings: ['Pipes & Fittings', 'Tools', 'Travel', 'Labor'] } as any,
```

**Impact:** `getDefaultExpenseCategories('plumber')` falls back to the generic `other` categories because the `expenseCategories` property doesn't exist on the plumber entry. The `as any` cast hides this from TypeScript.

**Fix:** Change `pipes_fittings` → `expenseCategories`.

---

### 1.6 — `repayStaffAdvance` Mutates Principal Instead of Tracking Repayments

#### [MODIFY] [crud.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/crud.ts)

**Problem:** `repayStaffAdvance()` at line 1067 reduces the `amount` field directly:
```ts
const remaining = advance.amount - amount;
await db.staff_advances.update(id, { amount: remaining, ... });
```

**Impact:** This mutates the original principal, making it impossible to know how much was originally borrowed. After 2 repayments, `advance.amount` reflects neither the original loan nor the outstanding balance accurately. Installment counter decrements even if the repayment amount is partial.

**Fix:** Add a `total_repaid` field tracking cumulative repayments. Calculate outstanding as `amount - total_repaid`. Don't mutate `amount`.

---

### 1.7 — `StaffSalary` Missing `last_modified` Field

#### [MODIFY] [crud.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/crud.ts)

**Problem:** `createStaffSalary()` at line 1000 does not set `last_modified`. The `StaffSalary` interface likely expects it for sync compatibility, and the sync engine filters by `last_modified`. Salary records will never be synced to Supabase.

**Fix:** Add `last_modified: now()` to the salary object.

---

### 1.8 — Sync Engine Missing `purchase_orders` Table

#### [MODIFY] [sync.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/sync.ts)

**Problem:** `SYNCABLE_TABLES` at line 5 includes `purchase_order_items` and `purchase_payments` but **omits `purchase_orders`** itself. This means PO headers are never synced to the cloud, but their line items and payments are — creating orphaned records in Supabase.

**Fix:** Add `'purchase_orders'` to the `SYNCABLE_TABLES` array.

---

## Phase 2: Inventory & Stock Integrity
**Risk: 🟠 High | Estimated effort: ~3 hours**

Stock mutations are scattered across 4+ functions with no centralized service. This creates desync opportunities.

---

### 2.1 — No Stock Deduction on Invoice Creation

#### [MODIFY] [crud.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/crud.ts)

**Problem:** `createInvoice()` (line 113) adds the invoice and items in a transaction, increments the invoice counter, but **never deducts stock** from `products`. Stock is only deducted during `convertEstimateToInvoice()`.

**Impact:** For direct invoice creation (the primary flow), inventory is never decreased. Stock counts become increasingly inaccurate over time.

**Fix:** Within the `createInvoice` transaction, add stock deduction logic:
- Join `db.products` to the transaction tables
- For each item, match by `description` against product `name` (or add a `product_id` field to `InvoiceItem`)
- Deduct `item.quantity` from `product.stock_quantity` for non-service products

---

### 2.2 — Negative Stock Allowed Without Warning

#### [MODIFY] [crud.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/crud.ts)

**Problem:** Stock deduction in `convertEstimateToInvoice()` (line 214) uses `Math.max(0, ...)` which prevents negatives, but doesn't warn the user. More importantly, if we fix 2.1, the new deduction path should also validate.

**Fix:** 
- Add a pre-flight check before the transaction that validates stock availability
- Return a warning array if any items would go below zero
- Let the UI decide whether to proceed (soft warning, not hard block)

---

### 2.3 — No Stock Restoration on Invoice Deletion

#### Current behavior: Soft-deleting an invoice (`is_deleted: true`) does not restore the stock that was deducted when the invoice was created.

**Fix:** Create a `softDeleteInvoice()` function that:
1. Marks the invoice as deleted
2. Restores stock quantities for all items (reverse of deduction)
3. Wraps both in a transaction

---

### 2.4 — No Stock Restoration on Invoice Edit

#### [MODIFY] [crud.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/crud.ts)

**Problem:** `updateInvoice()` (line 150) deletes old items and creates new ones, but never adjusts stock. If a user changes quantity from 10 to 5, the 5-unit difference is never restored.

**Fix:** Within the update transaction:
1. First, restore stock for all old items
2. Then, deduct stock for all new items
3. Net effect = correct stock adjustment

---

### 2.5 — Create Centralized `InventoryService`

#### [NEW] [inventory-service.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/services/inventory-service.ts)

Create a single service module that all stock-mutating functions call through:

```ts
export async function adjustStock(productId: string, delta: number, reason: string): Promise<void>
export async function validateStock(items: { productId: string; quantity: number }[]): Promise<StockWarning[]>
export async function bulkAdjustStock(adjustments: StockAdjustment[]): Promise<void>
```

Then refactor `createInvoice`, `updateInvoice`, `softDeleteInvoice`, `convertEstimateToInvoice`, `createPurchaseOrder`, and `updatePurchaseOrderStatus` to call this service instead of doing inline stock mutations.

---

## Phase 3: Sync Engine Hardening
**Risk: 🟠 High | Estimated effort: ~2 hours**

The current sync engine has a fundamental data-overwrite vulnerability.

---

### 3.1 — `pullSync` Overwrites Local Changes (LWW Violation)

#### [MODIFY] [sync.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/sync.ts)

**Problem:** `pullSync()` at line 96 uses `bulkPut(data)` which unconditionally overwrites local records. If the user made a local change (e.g., edited an invoice offline) and then a stale version comes in from Supabase, the local edit is lost.

**Fix:** Replace `bulkPut` with record-level timestamp checking:
```ts
for (const remoteRecord of data) {
  const localRecord = await (db as any)[table].get(remoteRecord.id);
  if (!localRecord || remoteRecord.last_modified > localRecord.last_modified) {
    await (db as any)[table].put(remoteRecord);
  }
  // else: local is newer, skip — pushSync will handle it
}
```

This implements true Last-Write-Wins at the record level.

---

### 3.2 — Missing Tables in Sync

#### [MODIFY] [sync.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/sync.ts)

**Problem:** `SYNCABLE_TABLES` is missing several tables that have `last_modified` fields:
- `purchase_orders` (mentioned in 1.8)
- `staff`
- `staff_salaries`
- `staff_advances`
- `staff_documents`
- `attendance`
- `leave_requests`
- `tasks`
- `loans`
- `branches`
- `bom`

**Fix:** Add all tables with `last_modified` to the syncable list.

---

### 3.3 — Sync Error Silently Swallowed

#### [MODIFY] [sync.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/sync.ts)

**Problem:** `runSyncEngine()` catches errors and logs them to console (line 117), but never notifies the UI. Users have no indication that sync failed.

**Fix:** 
- Add a Svelte store `syncStatus` with states: `idle | syncing | success | error`
- Expose `lastSyncError` for UI display
- Update the app layout to show a subtle sync status indicator

---

## Phase 4: Analytics Precision Pass
**Risk: 🟡 Medium | Estimated effort: ~2 hours**

Multiple analytics calculations use hardcoded assumptions that produce misleading results.

---

### 4.1 — Hardcoded 60% COGS Assumption

#### [MODIFY] [analytics.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/utils/analytics.ts)

**Problem:** 
- `calculateFinancialRatios()` line 151: `const grossProfit = revenue - (revenue * 0.6)` — assumes 60% COGS for ALL business types.
- `calculateInventoryMetrics()` line 258: `const cogs = totalInventoryValue * 0.6` — same assumption for inventory turnover.

**Impact:** A jewelry store (90% COGS) and a SaaS consultant (5% COGS) get identical gross margin calculations. This is fundamentally misleading.

**Fix:** Calculate actual COGS from purchase data:
```ts
// Actual COGS = sum of (purchase_price × quantity_sold) for all sold items
const actualCOGS = products.reduce((sum, p) => {
  const soldQty = salesMap.get(p.id) || 0;
  return sum + (p.purchase_price * soldQty) / 100;
}, 0);
```
Fall back to 60% only if no purchase price data exists.

---

### 4.2 — ABC Analysis Ignores Actual Sales Data

#### [MODIFY] [analytics.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/utils/analytics.ts)

**Problem:** `calculateABCAnalysis()` lines 190-192 starts a loop over invoices to build `productSales` but the loop body is **empty** — it does nothing:
```ts
for (const invoice of invoices) {
  if (invoice.document_type !== 'INVOICE' || invoice.status !== 'PAID') continue;
}
```

Then at line 197, `annualValue` is calculated as `selling_price × stock_quantity` — this is the current inventory value, NOT sales value. ABC analysis should rank by revenue contribution, not sitting inventory.

**Fix:** 
1. Actually populate `productSales` from invoice items (requires joining invoice_items)
2. Use accumulated sales revenue as the ranking metric

---

### 4.3 — Dead Stock Detection Uses Wrong Criteria

#### [MODIFY] [analytics.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/utils/analytics.ts)

**Problem:** `calculateInventoryMetrics()` line 243 defines dead stock as `stock_quantity <= 0` (out of stock). But dead stock means items that **have stock but haven't sold** in X days. Zero stock items are the opposite — they sold out.

**Fix:** Dead stock should be items where:
- `stock_quantity > 0` AND
- No invoice items reference this product in the last `DEAD_STOCK_DAYS` (90 days)

---

### 4.4 — Reorder Point Calculation Is Circular

#### [MODIFY] [analytics.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/utils/analytics.ts)

**Problem:** Line 266 calculates `avgDailySales = product.stock_quantity / 30`. This uses current stock as a proxy for 30-day sales, which is wrong — a product with 1000 units in stock doesn't sell 33/day.

**Fix:** Calculate actual average daily sales from invoice history over the last 30/60/90 days.

---

### 4.5 — `getOutstandingTotal` Doesn't Account for Partial Payments

#### [MODIFY] [crud.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/crud.ts)

**Problem:** `getOutstandingTotal()` (line 265) already attempts payment-aware calculation, but it sums ALL payments linked to ANY invoice, not per-invoice. The `paidInvoiceIds` set is populated from all payments but then used to re-sum all payments — the filter is a no-op.

**Fix:** Simplify to:
```ts
const totalBilled = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
return totalBilled - totalPaid;
```

---

### 4.6 — Goal Progress Has Dead Code

#### [MODIFY] [analytics.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/utils/analytics.ts)

**Problem:** `calculateGoalProgress()` at lines 663-664 declares `daysElapsed = 0` and `expectedProgress = 0` but never uses or updates them. The `actualDaily` calculation divides by `30 - daysTotal` which can produce negative values.

**Fix:** Calculate `daysElapsed` from goal creation date, and use it properly in the progress prediction formula.

---

## Phase 5: Data Validation Layer
**Risk: 🟢 Medium | Estimated effort: ~3 hours**

No input validation exists at the data layer. Invalid data silently flows into IndexedDB.

---

### 5.1 — Add Zod Schemas for All Entities

#### [NEW] [validators.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/utils/validators.ts)

Create validation schemas for all core entities:

```ts
import { z } from 'zod';

export const BusinessSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).or(z.literal('')),
  state_code: z.string().length(2),
  phone: z.string().max(15),
  email: z.string().email().or(z.literal('')),
  // ...
});

export const InvoiceSchema = z.object({
  grand_total: z.number().int().min(0),
  subtotal: z.number().int().min(0),
  status: z.enum(['PAID', 'UNPAID', 'PARTIAL']),
  document_type: z.enum(['INVOICE', 'ESTIMATE', 'PROFORMA', 'CREDIT_NOTE', 'DEBIT_NOTE']).optional(),
  // ...
});

export const PaymentSchema = z.object({
  amount: z.number().int().positive('Payment amount must be positive'),
  method: z.enum(['CASH', 'UPI', 'CARD', 'BANK', 'CHEQUE', 'OTHER']),
  // ...
});
```

### 5.2 — Anomaly Detection Guards

#### [NEW] [anomaly-detection.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/utils/anomaly-detection.ts)

Implement pre-save validation guards:
- **Expense spike detection:** Flag expenses 300%+ above category average
- **Duplicate invoice detection:** Same customer + same date + ±10% amount
- **Negative margin detection:** Selling price below purchase price on invoice items
- **Impossible quantity detection:** Invoice quantity > current stock (warning, not block)

### 5.3 — Wire Validation into CRUD Functions

#### [MODIFY] [crud.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/crud.ts)

Add validation calls at the top of each create/update function:
```ts
export async function createInvoice(data, items) {
  const validated = InvoiceSchema.parse(data); // throws on invalid
  const warnings = await detectAnomalies(validated, items);
  // proceed with validated data
}
```

---

## Phase 6: Performance & Polish
**Risk: 🟢 Low | Estimated effort: ~2 hours**

---

### 6.1 — Sequential Awaits in Dashboard Loading

#### [MODIFY] [dashboard/+page.svelte](file:///d:/Copy%20of%20hisaab/Hisaab/src/routes/(app)/dashboard/+page.svelte)

**Problem:** `loadDashboard()` (line 28) makes 5 sequential `await` calls. Each waits for the previous to complete.

**Fix:** Use `Promise.all` for independent queries:
```ts
const [revenue, outstanding, patientCount, invoices, alerts] = await Promise.all([
  getRevenueTotal(biz.id),
  getOutstandingTotal(biz.id),
  countPatients(biz.id),
  getCachedInvoices(biz.id, force),
  getDashboardAlerts(biz.id)
]);
```

---

### 6.2 — `getPatients` Sorting Is Incorrect

#### [MODIFY] [crud.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/crud.ts)

**Problem:** `getPatients()` (line 73) calls `.reverse().sortBy('created_at')`. In Dexie, `.reverse()` reverses the index iteration order, but `.sortBy()` re-sorts the results — the `.reverse()` is a no-op. This pattern is repeated across `getInvoices`, `getProducts`, `getExpenses`, `getPayments`, `getSuppliers`, and `getPurchaseOrders`.

**Fix:** Remove `.reverse()` and use proper descending sort:
```ts
return (await db.patients
  .where('business_id').equals(businessId)
  .filter(p => !p.is_deleted)
  .sortBy('created_at'))
  .reverse(); // reverse AFTER sortBy
```

---

### 6.3 — Cache Not Invalidated on Key Mutations

#### [MODIFY] [crud.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/crud.ts)

**Problem:** `invalidateBusinessCache(businessId)` is only called in `createPatient()` (line 68), `createInvoice()` (line 145), and `createProduct()` (line 484). It is **NOT** called in:
- `createExpense()`
- `createPayment()`
- `updateInvoice()`
- `softDeletePatient()`
- `softDeleteProduct()`
- `softDeleteExpense()`
- `softDeletePayment()`
- `updateInvoiceStatus()`
- `createPurchaseOrder()`

**Impact:** The dashboard and cached queries show stale data after these operations until the cache TTL expires (15-30 seconds).

**Fix:** Add `invalidateBusinessCache(businessId)` to all mutation functions.

---

### 6.4 — `getCachedBusiness` Doesn't Filter Deleted

#### [MODIFY] [cache.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/utils/cache.ts)

**Problem:** `getCachedBusiness()` (line 120) calls `db.businesses.get(id)` directly without checking `is_deleted`. A soft-deleted business could still be served from cache.

**Fix:** Add `!business.is_deleted` check before caching.

---

### 6.5 — CSV Export Doesn't Filter Deleted Records

#### [MODIFY] [export.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/utils/export.ts)

**Problem:** `exportInvoicesToCSV()` (line 6), `exportPaymentsToCSV()` (line 45), and `exportExpensesToCSV()` (line 30) fetch all records via `.toArray()` without filtering `is_deleted`. Deleted records appear in CSV exports.

Only `exportProductsToCSV()` and `exportCustomersToCSV()` correctly filter deleted records.

**Fix:** Add `.filter(r => !r.is_deleted)` to all CSV export functions.

---

### 6.6 — Operational Metrics Use `issue_date` for Hour Analysis

#### [MODIFY] [analytics.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/utils/analytics.ts)

**Problem:** `calculateOperationalMetrics()` at line 518 does `const date = new Date(invoice.issue_date)` then gets `date.getHours()`. But `issue_date` is stored as a date-only string (`"2026-04-15"`) — parsing this gives midnight UTC, making all hours appear as 0 or 5:30 (IST offset). Peak hours analysis is meaningless.

**Fix:** Use `created_at` (which has full ISO timestamp) instead of `issue_date` for time-of-day analysis.

---

### 6.7 — `LeaveRequest` Missing `last_modified`

#### [MODIFY] [crud-extended.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/db/crud-extended.ts)

**Problem:** `createLeaveRequest()` (line 47) doesn't set `last_modified`. `approveLeaveRequest()` (line 66) also doesn't set `last_modified`. These records won't sync.

**Fix:** Add `last_modified: now()` to both functions.

---

### 6.8 — Purge Deleted Data Utility

#### [NEW] [purge.ts](file:///d:/Copy%20of%20hisaab/Hisaab/src/lib/utils/purge.ts)

**Problem:** Soft-deleted records accumulate indefinitely in IndexedDB, consuming storage and slowing filter queries.

**Fix:** Create a `purgeDeletedRecords()` utility that permanently removes all records where `is_deleted === true` and `last_modified` is older than 30 days. Wire it into Settings as a "Clean Up Storage" button.

---

## Verification Plan

### Automated Tests
1. **Build verification:** `npm run build` — ensure zero TypeScript errors
2. **Dev server smoke test:** `npm run dev` — verify app loads without console errors
3. **Browser test:** Navigate through Dashboard → Invoices → Create Invoice → Inventory → Settings → Backup/Restore flow

### Manual Verification
For each phase:

| Phase | Verification |
|-------|-------------|
| 1 - Critical Bugs | Create a new business from Settings, verify `business_category` persists. Backup → Wipe → Restore, verify all tables restored. Check recurring schedule generates invoices with `UNPAID` status. |
| 2 - Inventory | Create an invoice with products, verify stock decreases. Edit invoice quantity, verify stock adjusts. Delete invoice, verify stock restores. |
| 3 - Sync | Make offline edit → go online → verify local edit preserved. Make cloud edit → pull sync → verify local newer record not overwritten. |
| 4 - Analytics | Open Reports page, verify gross margin uses actual purchase prices. Verify ABC analysis ranks by sales revenue, not stock value. |
| 5 - Validation | Try to create an expense 500% above category average → verify warning appears. Try to create a duplicate invoice → verify detection. |
| 6 - Performance | Measure dashboard load time before/after `Promise.all` optimization. Verify cache invalidation after creating an expense. |

---

## Summary of Changes

| Phase | Files Modified | Files Created | Priority |
|-------|---------------|---------------|----------|
| 1 — Critical Bugs | `crud.ts`, `export.ts`, `sync.ts`, `category-defaults.ts` | — | 🔴 Critical |
| 2 — Inventory | `crud.ts` | `inventory-service.ts` | 🟠 High |
| 3 — Sync | `sync.ts` | — | 🟠 High |
| 4 — Analytics | `analytics.ts`, `crud.ts` | — | 🟡 Medium |
| 5 — Validation | `crud.ts` | `validators.ts`, `anomaly-detection.ts` | 🟡 Medium |
| 6 — Polish | `crud.ts`, `crud-extended.ts`, `cache.ts`, `export.ts`, `analytics.ts`, `dashboard/+page.svelte` | `purge.ts` | 🟢 Low |

**Total: 34 individual fixes across 6 phases.**
