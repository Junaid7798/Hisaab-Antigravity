# Hisaab — Indian Business Management App

> **Hisaab** (हिसाब) means *accounts* in Hindi/Urdu. A complete, offline-first business management app built for Indian SMBs — from kirana stores and pharmacies to freelancers and clinics.

---

## Features

### Core Billing
- **GST-compliant invoices** — CGST/SGST (intra-state) and IGST (inter-state) auto-calculation
- **Estimates / Quotations** — convert to invoice in one tap
- **Recurring invoices** — auto-generate on schedule (weekly, monthly, quarterly)
- **Credit/Debit notes** — handle returns and adjustments
- **PDF export** — professional invoice PDFs with business logo and QR code
- **POS Mode** — fast counter billing for walk-in customers with barcode/QR scanner

### Customer & Supplier Management
- Customer ledger with outstanding balance tracking
- Supplier directory and purchase order management
- Customer-wise invoice history and payment tracking
- State-wise GST compliance (27 Indian states)

### Financial Tracking
- **Expense management** — categorized expenses with receipt storage
- **Loans & EMI** — track business loans and repayment schedules
- **Staff advances** — log and auto-deduct from monthly salary
- **GST Reports** — GSTR-1 summaries ready for filing

### Staff & HR
- Staff directory with roles, UPI ID, and salary configuration
- Salary slip generation with PDF export
- Attendance marking (present / absent / half-day)
- Leave request management with approval workflow
- Advance salary tracking with auto-deduction from payroll

### Analytics & Intelligence
- Revenue trends with month-over-month comparison
- Outstanding collections aging analysis (30 / 60+ day buckets)
- Inventory low-stock and slow-moving alerts
- Business insights engine — churn risk, operating-at-loss detection, overdue collection alerts

### Settings & Customization
- **8 visual themes** — 4 light + 4 dark professional palettes
- **Multi-business** — manage multiple shops/branches from one login
- **Multi-language** — English, Hindi (हिन्दी), Marathi (मराठी)
- **Adaptive terminology** — "Patient" for clinics, "Client" for agencies, "Customer" for retail
- **Auto backup** — daily/weekly/monthly JSON export to device

### Data & Sync
- **Offline-first** — fully functional without internet using IndexedDB (Dexie.js)
- **Optional cloud sync** — Supabase-powered real-time sync across devices
- **Local-only mode** — privacy-first, data never leaves the device if Supabase is not configured

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [SvelteKit](https://kit.svelte.dev/) v2 + Svelte 5 (runes) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) v4 |
| Local database | [Dexie.js](https://dexie.org/) (IndexedDB wrapper) |
| Cloud database | [Supabase](https://supabase.com/) (optional) |
| Auth | Supabase Auth (optional) |
| Icons | [Material Symbols](https://fonts.google.com/icons) (outlined) |
| PDF generation | [jsPDF](https://github.com/parallax/jsPDF) + jspdf-autotable |
| Charts | [Chart.js](https://www.chartjs.org/) via svelte-chartjs |
| Internationalisation | [svelte-i18n](https://github.com/kaisermann/svelte-i18n) |
| Validation | [Zod](https://zod.dev/) |
| Build tool | [Vite](https://vitejs.dev/) v8 |
| Language | TypeScript |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### 1. Clone and install

```bash
git clone https://github.com/Junaid7798/Hisaab-Antigravity.git
cd Hisaab-Antigravity
npm install
```

### 2. Environment setup

Create a `.env` file in the project root:

```env
# Optional — only needed for cloud sync and multi-device auth.
# Leave blank (or omit the file entirely) to run fully offline.

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Local-only mode (no .env needed):** The app works entirely offline. All data is stored in the browser's IndexedDB. No account or internet connection required.
>
> **Cloud sync mode:** Configure the Supabase variables above, then users can sign up / log in and sync across devices in real time.

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Build for production

```bash
npm run build
npm run preview   # preview production build locally
```

### 5. Type checking

```bash
npm run check
```

---

## Project Structure

```
src/
├── lib/
│   ├── components/              # Reusable UI components
│   │   ├── Input.svelte         # text-base input (prevents iOS auto-zoom)
│   │   ├── Select.svelte        # Dropdown select
│   │   ├── Modal.svelte         # Slide-up modal sheet
│   │   ├── Sidebar.svelte       # Desktop sidebar + mobile bottom nav
│   │   ├── TopNav.svelte        # Sticky top navigation bar
│   │   ├── StatusChip.svelte    # Invoice status badge
│   │   ├── EmptyState.svelte    # Empty screen with CTA
│   │   ├── PatientAvatar.svelte # Initials avatar
│   │   ├── CommandPalette.svelte# ⌘K command palette
│   │   └── Toast.svelte         # Notification toasts
│   ├── db/
│   │   ├── index.ts             # Dexie schema — all table definitions & types
│   │   ├── crud.ts              # Core CRUD operations
│   │   ├── crud-extended.ts     # Extended ops (leave, attendance, loans)
│   │   ├── supabase.ts          # Supabase client initialization
│   │   └── sync.ts              # Offline ↔ cloud sync logic
│   ├── stores/
│   │   ├── auth.ts              # Supabase auth state (currentUser)
│   │   ├── session.ts           # Active business ID + terminology
│   │   ├── preferences.ts       # Theme, language, backup settings
│   │   ├── insights.ts          # Business intelligence alert store
│   │   ├── ui.ts                # Mobile drawer open state, badge counts
│   │   ├── toast.ts             # Toast notification queue
│   │   └── theme.ts             # Theme application
│   ├── utils/
│   │   ├── business-features.ts # Feature flags per business category
│   │   ├── terminology.ts       # Dynamic label system (Patient/Client/Customer)
│   │   ├── currency.ts          # INR formatting — ₹1.2L, ₹45K, ₹2.4Cr
│   │   ├── helpers.ts           # Date helpers, EXPENSE_CATEGORIES, INDIAN_STATES
│   │   ├── cache.ts             # Customer list caching
│   │   └── export.ts            # JSON backup export
│   └── i18n/
│       └── locales/
│           ├── en.json          # English
│           ├── hi.json          # Hindi (हिन्दी)
│           └── mr.json          # Marathi (मराठी)
└── routes/
    ├── login/                   # Email/password auth
    ├── forgot-password/         # Password reset
    ├── update-password/         # New password after reset
    ├── onboarding/              # Business setup wizard
    └── (app)/                   # Protected app shell
        ├── +layout.svelte       # Sidebar, TopNav, route guard, auto-backup
        ├── dashboard/           # KPI cards, recent invoices, smart nudges
        ├── invoices/            # Invoice list, new, edit, view, return
        ├── estimates/           # Quotations — new + list
        ├── recurring/           # Subscription billing templates
        ├── pos/                 # Point of Sale counter mode
        ├── patients/            # Customer/client/patient directory
        ├── suppliers/           # Supplier directory
        ├── inventory/           # Stock management
        ├── purchases/           # Purchase orders
        ├── expenses/            # Expense tracking + category breakdown
        ├── staff/               # Staff, salary slips, advances
        ├── attendance/          # Daily attendance + leave requests
        ├── loans/               # Loan & EMI tracker
        ├── gst/                 # GST filing summaries
        ├── reports/             # P&L, cash flow, outstanding reports
        ├── analytics/           # Charts and trend visualizations
        ├── insights/            # Full business intelligence feed
        ├── branches/            # Multi-branch / multi-location management
        └── settings/            # Business profile, theme, sync, backup
```

---

## Business Categories

Hisaab automatically adapts UI, terminology, and feature flags based on business type selected during onboarding:

| Category | Person label | Key features enabled |
|----------|-------------|----------------------|
| Pharmacy | Patient | POS, Inventory, Suppliers, GST |
| Clinic / Doctor | Patient | Appointments, no inventory |
| Kirana / Grocery | Customer | POS, Inventory, Suppliers, Purchases |
| Restaurant / Café | Customer | POS, no estimates |
| Freelancer / Agency | Client | Estimates, Recurring, no POS |
| Manufacturer | Customer | Inventory, Purchases, Suppliers, GST |
| Salon / Spa | Customer | POS, Services, no inventory |
| Tuition / School | Student | Recurring fees, no GST, no POS |
| Trader / Distributor | Customer | Full feature set |

---

## Mobile UI

Hisaab is built **mobile-first** — designed as the primary billing device for business owners who operate from a phone.

### Key Design Decisions

| Principle | Implementation |
|-----------|----------------|
| 44px+ touch targets | All buttons, nav items, and list rows meet Apple HIG minimum |
| No iOS zoom on focus | All `<input>` and `<select>` use `text-base` (16px minimum) |
| All KPI cards visible | `grid grid-cols-3` — no horizontal scroll hiding the 3rd card |
| Compact above-fold | `line-clamp-1` on insight banners, `truncate` on subtitles |
| Overflow protection | `truncate` on all value elements in constrained grid columns |
| Accessible icons | `aria-hidden="true"` on all decorative icon spans |

### Navigation Structure

```
Mobile  (< 1024px): Sticky TopNav + Bottom Nav (Home | Invoices | Expenses | Clients | More)
Desktop (≥ 1024px): Collapsible left Sidebar + TopNav (no bottom nav)
```

### Responsive Breakpoints

| Tailwind prefix | Viewport | Changes |
|----------------|----------|---------|
| *(none)* | < 640px | Single column, minimal labels, bottom nav |
| `sm:` | ≥ 640px | Secondary labels appear, "All →" links visible |
| `md:` | ≥ 768px | Search bar in header, tablet layout |
| `lg:` | ≥ 1024px | Sidebar replaces bottom nav, multi-column grids |

---

## Theming

8 built-in themes, selectable from **Settings → Appearance**:

| Variant | Themes |
|---------|--------|
| **Light** | Default Blue, Warm Parchment, Sage Green, Slate Blue |
| **Dark** | Midnight, Warm Charcoal, Forest Dark, Navy Dark |

Themes use CSS custom properties mapped to Material Design 3 color roles:
`--color-primary`, `--color-surface`, `--color-surface-container`, `--color-on-surface`, etc.

---

## Data Model

All data lives in **IndexedDB** via Dexie.js, synced optionally to Supabase Postgres.

**Tables:**

| Table | Description |
|-------|-------------|
| `businesses` | Multi-tenant root — one record per business |
| `patients` | Customers / clients / patients (label adapts per business type) |
| `invoices` | Billing documents |
| `invoice_items` | Line items for invoices |
| `estimates` | Quotation documents |
| `estimate_items` | Line items for estimates |
| `expenses` | Categorized business expenses |
| `staff` | Staff directory with roles and salary config |
| `salary_records` | Monthly payroll records |
| `advance_records` | Staff advance loans |
| `attendance_records` | Daily attendance per staff |
| `leave_requests` | Leave applications + approval status |
| `loans` | Business loans |
| `loan_payments` | Loan repayment schedule |
| `inventory_items` | Stock catalog |
| `stock_movements` | Stock in / out transactions |
| `suppliers` | Vendor directory |
| `purchases` | Purchase orders |
| `purchase_items` | Line items for purchase orders |
| `recurring_invoices` | Subscription billing templates |

---

## Development

### Adding a new page

1. Create `src/routes/(app)/your-route/+page.svelte`
2. Add a nav entry in `src/lib/components/Sidebar.svelte` (`navItems` array)
3. Add i18n key in `src/lib/i18n/locales/en.json` under `nav.*`

### Adding a new business category

1. Add to `BusinessCategory` union type in `src/lib/utils/terminology.ts`
2. Add terminology config (person/people/venue labels) in `terminology.ts`
3. Add feature flags in `src/lib/utils/business-features.ts`
4. Add display label in `en.json` under `onboarding.categories`

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | No | Supabase project URL. Omit for local-only mode. |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anon key. Omit for local-only mode. |

### NPM scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server at localhost:5173 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run check` | TypeScript + Svelte type checking |
| `npm run check:watch` | Watch mode type checking |

---

## Changelog

### Mobile UI Optimization (2026-04-19)

Comprehensive mobile UI pass fixing visual regressions confirmed from device screenshots:

| Fix | Details |
|-----|---------|
| KPI stat cards → `grid grid-cols-3` | Dashboard + Clients: all 3 cards always visible; eliminated cut-off 3rd card on 390px devices |
| `text-base` on all `<input>` / `<select>` | Prevents iOS Safari auto-zoom on focus across all forms |
| Insight banner `line-clamp-1` on mobile | Banner height reduced from ~100px to ~48px; preserves above-fold content |
| Invoices page title i18n fix | List page shows "Invoices", not the new-invoice form's "Create GST Invoice" |
| Page subtitle `truncate` | Single-line subtitles on Dashboard, Invoices, and Clients pages |
| Filter pills `py-1.5 min-h-[36px]` | Larger touch targets on Invoices and Expenses pages |
| `aria-hidden="true"` on decorative icons | Screen reader accessibility on all KPI cards, alert banners, and list row affordances |
| `truncate` on all grid value elements | Prevents overflow in constrained 3-column grid cards |

### Theme & UI Overhaul (2026-04-17)

- Visual theme picker with 8 curated themes (4 light, 4 dark)
- Muted professional color palettes replacing loud accent colors
- Linear-style navigation with layered KPI cards

### Intelligence Engine (2026-04-17)

- Inline business alerts (churn risk, loss detection, overdue aging)
- Insights hub with full alert feed

---

## Security Notes

- `.env` files are git-ignored — never commit API keys
- `.claude/settings.local.json` is git-ignored
- Supabase anon keys are safe for client-side use (Row Level Security enforced on the server)
- Local-only mode stores zero data outside the user's device

---

## License

Private — All rights reserved.
