# Hisaab — Database Schema & CRUD API

> Last updated: 2026-04-14

## Database Engine

- **Dexie.js** wrapping **IndexedDB**
- Database name: `HisaabDB`
- Version: 1

## Tables

### `businesses`
The clinic/business profile. Only one active record per instance.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `string` (UUID) | Primary key |
| `owner_id` | `string` | Supabase user ID (future use) |
| `name` | `string` | Clinic name |
| `gstin` | `string` | GST Identification Number |
| `state_code` | `string` | 2-digit Indian state code |
| `address` | `string` | Full address |
| `phone` | `string` | Contact phone |
| `email` | `string` | Contact email |
| `logo_base64` | `string` | Base64-encoded logo image |
| `invoice_counter` | `number` | Next invoice serial number |
| `fy_start` | `string` | Financial year start date |
| `is_deleted` | `boolean` | Soft delete flag |
| `created_at` | `string` | ISO timestamp |
| `last_modified` | `string` | ISO timestamp for sync |

### `patients`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `string` (UUID) | Primary key |
| `business_id` | `string` | FK → businesses |
| `name` | `string` | Full name |
| `phone` | `string` | Phone number |
| `email` | `string` | Email |
| `address` | `string` | Full address |
| `state_code` | `string` | 2-digit state code (for GST) |
| `notes` | `string` | Internal notes |
| `is_deleted` | `boolean` | Soft delete |
| `created_at` | `string` | ISO timestamp |
| `last_modified` | `string` | ISO timestamp |

### `invoices`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `string` (UUID) | Primary key |
| `business_id` | `string` | FK → businesses |
| `patient_id` | `string` | FK → patients |
| `invoice_number` | `string` | e.g. `INV-2526-0042` |
| `issue_date` | `string` | ISO date |
| `due_date` | `string` | ISO date |
| `tax_type` | `enum` | `INTRA_STATE` / `INTER_STATE` / `EXEMPT` |
| `subtotal` | `number` | Paise (integer) |
| `total_tax` | `number` | Paise |
| `grand_total` | `number` | Paise |
| `cgst` | `number` | Paise |
| `sgst` | `number` | Paise |
| `igst` | `number` | Paise |
| `status` | `enum` | `PAID` / `UNPAID` / `PARTIAL` |
| `notes` | `string` | Free text |
| `is_deleted` | `boolean` | Soft delete |
| `created_at` | `string` | ISO timestamp |
| `last_modified` | `string` | ISO timestamp |

### `invoice_items`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `string` (UUID) | Primary key |
| `invoice_id` | `string` | FK → invoices |
| `description` | `string` | Service description |
| `hsn_sac` | `string` | HSN/SAC code |
| `quantity` | `number` | Integer x100 (1.00 = 100) |
| `rate` | `number` | Paise |
| `tax_rate` | `number` | Integer x100 (12% = 1200) |
| `amount` | `number` | Paise |
| `is_deleted` | `boolean` | Soft delete |
| `created_at` | `string` | ISO timestamp |
| `last_modified` | `string` | ISO timestamp |

### `expenses`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `string` (UUID) | Primary key |
| `business_id` | `string` | FK → businesses |
| `category` | `string` | e.g. Medical Supplies, Rent |
| `description` | `string` | Details |
| `amount` | `number` | Paise |
| `expense_date` | `string` | ISO date |
| `notes` | `string` | Internal memo |
| `receipt_base64` | `string` | Receipt image (base64) |
| `is_deleted` | `boolean` | Soft delete |
| `created_at` | `string` | ISO timestamp |
| `last_modified` | `string` | ISO timestamp |

## CRUD API (`src/lib/db/crud.ts`)

### Business
- `createBusiness(data)` → `Business`
- `getBusiness()` → `Business | undefined`
- `updateBusiness(id, data)` → `void`

### Patients
- `createPatient(businessId, data)` → `Patient`
- `getPatients(businessId)` → `Patient[]`
- `getPatient(id)` → `Patient | undefined`
- `updatePatient(id, data)` → `void`
- `softDeletePatient(id)` → `void`
- `searchPatients(businessId, query)` → `Patient[]`
- `countPatients(businessId)` → `number`

### Invoices
- `createInvoice(data, items)` → `Invoice` (transactional, auto-increments counter)
- `getInvoices(businessId)` → `Invoice[]`
- `getInvoice(id)` → `Invoice | undefined`
- `getInvoiceItems(invoiceId)` → `InvoiceItem[]`
- `getInvoicesByPatient(patientId)` → `Invoice[]`
- `updateInvoiceStatus(id, status)` → `void`
- `getOutstandingTotal(businessId)` → `number`
- `getRevenueTotal(businessId)` → `number`
- `getRecentInvoices(businessId, limit)` → `(Invoice & { patient_name })[]`

### Expenses
- `createExpense(businessId, data)` → `Expense`
- `getExpenses(businessId)` → `Expense[]`
- `getExpensesByCategory(businessId)` → `Record<string, number>`
- `getExpenseTotal(businessId)` → `number`
- `softDeleteExpense(id)` → `void`
