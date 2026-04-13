# Hisaab — Route Map & Navigation

> Last updated: 2026-04-14

## Route Structure

```
/                     → Redirects to /login
/login                → Authentication (standalone, no sidebar)
/(app)/               → App shell (Sidebar + TopNav)
  ├── dashboard/      → Dashboard Overview
  ├── patients/       → Patient List (search, filter, add)
  │   └── [id]/       → Patient Profile (invoice history)
  ├── invoices/
  │   └── new/        → Invoice Builder (GST calculator)
  ├── expenses/       → Expense Tracker (log, categorize)
  ├── reports/        → Reports & Analytics
  ├── settings/       → Business Profile & Subscription
  └── help/           → Help Center & Guides
```

## Page Descriptions

### `/login`
- **Layout**: Standalone (no sidebar/topnav)
- **Features**: Email/password form, Google OAuth button, testimonial sidebar
- **On submit**: Navigates to `/dashboard`

### `/dashboard`
- **Layout**: App shell
- **Data sources**: `getRevenueTotal()`, `getOutstandingTotal()`, `countPatients()`, `getRecentInvoices()`
- **Sections**: 3 KPI cards, Recent Invoices table, Quick Actions panel

### `/patients`
- **Layout**: App shell
- **Data sources**: `getPatients()`, `countPatients()`, `getOutstandingTotal()`
- **Features**: Add Patient modal, real-time search filter, stats cards
- **Actions**: Add, View, Navigate to profile

### `/patients/[id]`
- **Layout**: App shell
- **Data sources**: `getPatient()`, `getInvoicesByPatient()`
- **Sections**: Patient header, stats (total billed, outstanding, count), invoice history table

### `/invoices/new`
- **Layout**: App shell
- **Data sources**: `getPatients()`, `getBusiness()`
- **Features**: Patient selector, dynamic line items (add/remove), GST auto-calculator, billing summary
- **Logic**: Real-time CGST/SGST vs IGST based on state codes, all math in paise
- **Actions**: Save Invoice (creates invoice + items in transaction, increments counter)

### `/expenses`
- **Layout**: App shell
- **Data sources**: `getExpenses()`, `getExpensesByCategory()`, `getExpenseTotal()`
- **Features**: Log Expense modal, category breakdown cards, transactions table
- **Categories**: Medical Supplies, Utilities, Rent, Staff Payroll, Equipment, Maintenance, Insurance, Marketing, Travel, Others

### `/reports`
- **Layout**: App shell
- **Data sources**: All aggregate functions
- **Sections**: 4 KPI cards (Revenue, Expenses, Net Profit, Outstanding), Invoice volume, Expense breakdown with progress bars

### `/settings`
- **Layout**: App shell
- **Data sources**: `getBusiness()`
- **Features**: Business profile form (name, GSTIN, state code, address, phone, email), Save notification
- **Side panel**: Subscription plan card, Security info

### `/help`
- **Layout**: App shell
- **Sections**: Getting Started guide, GST Rules reference, Offline Mode explanation
