# Hisaab — Screen Reference (Production)

> Last updated: 2026-04-14  
> This document details every screen, button, input, and interactive element in the production Hisaab application.

---

## 1. Login (`/login`)

### Elements
| Type | Text / Label | Action |
|------|-------------|--------|
| `h1` | "Precision in Medical Billing" | Branding |
| `input[text]` | "Email or Phone" | Accepts login credential |
| `input[password]` | "Password" | Accepts password |
| `checkbox` | "Stay logged in for 30 days" | Persistent session toggle |
| `button[submit]` | "Sign In →" | Submits form, navigates to `/dashboard` |
| `button` | "Sign in with Google" | Google OAuth (placeholder) |
| `a` | "Forgot Password?" | Forgot password link |
| `a` | "Contact Sales" | Sales inquiry link |

---

## 2. Dashboard (`/dashboard`)

### KPI Cards
| Card | Data Source | Format |
|------|-----------|--------|
| Total Revenue | `getRevenueTotal()` | `formatINRCompact()` |
| Outstanding Payments | `getOutstandingTotal()` | `formatINRCompact()` |
| Total Patients | `countPatients()` | Integer |

### Recent Invoices Table
| Column | Data |
|--------|------|
| Patient | Avatar + name + invoice number |
| Date | `formatDate(issue_date)` |
| Amount | `formatINR(grand_total)` |
| Status | `StatusChip` (PAID/UNPAID/PARTIAL) |

### Buttons
| Button | Action |
|--------|--------|
| "Create New" | Links to `/invoices/new` |
| Quick Action: "New Invoice" | Links to `/invoices/new` |
| Quick Action: "Add Patient" | Links to `/patients` |
| Quick Action: "Log Expense" | Links to `/expenses` |
| "Get Support" | Links to `/help` |

---

## 3. Patients (`/patients`)

### Stats Cards
| Card | Data Source |
|------|-----------|
| Total Patients | `countPatients()` |
| Total Outstanding | `getOutstandingTotal()` |
| Registered Today | Filtered count by today's date |

### Elements
| Type | Text | Action |
|------|------|--------|
| `button` | "Add New Patient" | Opens Add Patient modal |
| `input[text]` | Search filter | Filters table by name/phone |
| `a` | "View →" (per row) | Navigate to `/patients/[id]` |

### Add Patient Modal
| Field | Type | Required |
|-------|------|----------|
| Full Name | `input[text]` | Yes |
| Phone | `input[tel]` | No |
| State | `select` (37 Indian states) | No |
| Address | `textarea` | No |

---

## 4. Patient Profile (`/patients/[id]`)

### Elements
| Type | Text | Action |
|------|------|--------|
| `a` | "New Invoice" | Links to `/invoices/new` |
| Table | Invoice History | Shows invoice_number, date, amount, status |

---

## 5. Invoice Builder (`/invoices/new`)

### Patient Info Section
| Field | Type | Source |
|-------|------|--------|
| Select Patient | `select` | `getPatients()` |
| Billing Date | `input[date]` | Default: today |
| Place of Supply | `select` | Indian states list |
| Invoice # | `input` (disabled) | Auto-generated |

### Line Items Table
| Column | Type | Description |
|--------|------|-------------|
| Description | `input[text]` | Service name |
| HSN/SAC | `input[text]` | Tax code |
| Qty | `input[number]` | Quantity |
| Rate (₹) | `input[number]` | Unit price |
| Tax % | `select` | 0%, 5%, 12%, 18%, 28% |
| Total | Computed | Auto-calculated |
| × | `button` | Remove row |

### Buttons
| Button | Action |
|--------|--------|
| "Add Row" | Adds new line item |
| "Cancel" | Back to dashboard |
| "Save Invoice" | Creates invoice + items in DB transaction |

### Billing Summary (auto-computed)
- Subtotal, CGST, SGST (or IGST), Total Tax, Grand Total
- GST compliance note (updates based on state codes)

### Options
- ☑ Mark as paid immediately
- ☐ Send copy to patient email

---

## 6. Expenses (`/expenses`)

### Summary Cards
- Total Expenses (big blue card)
- Category breakdown (4 top categories)

### Buttons
| Button | Action |
|--------|--------|
| "Log New Expense" | Opens expense modal |

### Expense Modal
| Field | Type | Required |
|-------|------|----------|
| Category | `select` | Yes |
| Description | `input[text]` | Yes |
| Amount (₹) | `input[number]` | Yes |
| Date | `input[date]` | No |

---

## 7. Reports (`/reports`)

### KPI Cards
| Card | Color |
|------|-------|
| Revenue | Teal (secondary) |
| Expenses | Red (error) |
| Net Profit | Teal or Red (conditional) |
| Outstanding | Orange (tertiary) |

### Sections
- Invoice Volume (count)
- Expense Breakdown (horizontal progress bars by category)

---

## 8. Settings (`/settings`)

### Business Profile Form
| Field | Type |
|-------|------|
| Clinic Name | `input[text]` |
| GSTIN | `input[text]` |
| State Code | `select` |
| Phone | `input[tel]` |
| Email | `input[email]` |
| Address | `textarea` |

### Buttons
| Button | Action |
|--------|--------|
| "Save Profile" | Creates or updates business record |
| "Upgrade to Pro" | Placeholder upsell |

---

## 9. Help Center (`/help`)

### Sections
- Getting Started (4 steps)
- GST Billing Rules (intra/inter-state + exempt)
- Offline Mode (IndexedDB explanation)
