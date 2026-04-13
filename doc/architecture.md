# Hisaab — System Architecture

> Last updated: 2026-04-14

## Overview

Hisaab is an **offline-first, GST-compliant clinical billing PWA** built for Indian clinics and MSMEs. It runs entirely in the browser using IndexedDB for data persistence and does not require a server for core functionality.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | SvelteKit 2 + Svelte 5 | SSR, routing, runes-based reactivity |
| Styling | Tailwind CSS v4 | Utility-first CSS with `@theme` design tokens |
| Database | Dexie.js (IndexedDB) | Offline-first local storage, full CRUD |
| Fonts | Google Fonts (Manrope + Inter) | Typography system |
| Icons | Material Symbols Outlined | Variable-weight icon system |
| Build | Vite 8 | Dev server, HMR, production bundling |
| Language | TypeScript 6 | Type safety across all modules |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Browser (PWA)                     │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  SvelteKit  │  │   Dexie.js   │  │  Tailwind  │ │
│  │   Routes    │──│  IndexedDB   │  │  Styles    │ │
│  └──────┬──────┘  └──────┬───────┘  └────────────┘ │
│         │                │                          │
│  ┌──────┴──────┐  ┌──────┴───────┐                  │
│  │  Components │  │  CRUD Layer  │                  │
│  │  (Shared)   │  │  (db/crud)   │                  │
│  └──────┬──────┘  └──────┬───────┘                  │
│         │                │                          │
│  ┌──────┴────────────────┴───────┐                  │
│  │       Business Logic          │                  │
│  │  (GST Engine, Currency, etc)  │                  │
│  └───────────────────────────────┘                  │
└─────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── app.html                    # HTML shell
├── lib/
│   ├── components/             # Reusable UI components
│   │   ├── Sidebar.svelte      # Main navigation sidebar
│   │   ├── TopNav.svelte       # Top navigation bar
│   │   ├── StatusChip.svelte   # Invoice status badges
│   │   ├── PatientAvatar.svelte# Initials-based avatar
│   │   └── EmptyState.svelte   # Zero-data placeholder
│   ├── db/
│   │   ├── index.ts            # Dexie schema + types
│   │   └── crud.ts             # All CRUD operations
│   └── utils/
│       ├── currency.ts         # INR formatting (paise-based)
│       ├── gst.ts              # GST calculation engine
│       ├── helpers.ts          # Dates, initials, state codes
│       └── invoice-number.ts   # Invoice number generator
├── routes/
│   ├── +layout.svelte          # Root layout (CSS import)
│   ├── +page.svelte            # Redirects to /login
│   ├── login/+page.svelte      # Auth page
│   └── (app)/                  # Authenticated app shell
│       ├── +layout.svelte      # Sidebar + TopNav wrapper
│       ├── dashboard/          # Main dashboard
│       ├── patients/           # Patient list + [id] profile
│       ├── invoices/new/       # Invoice builder
│       ├── expenses/           # Expense tracking
│       ├── reports/            # Analytics
│       ├── settings/           # Business profile
│       └── help/               # Help center
```

## Key Design Decisions

1. **Offline-First**: All data in IndexedDB. No server required for CRUD.
2. **Integer Paise**: All monetary values stored as integers (paise) to avoid floating-point errors.
3. **Soft Deletes**: Records are never hard-deleted; `is_deleted` flag + `last_modified` for future sync.
4. **UUID v4**: All IDs use `crypto.randomUUID()` to prevent sync collisions.
5. **Material Design 3**: Full MD3 color token system via Tailwind v4 `@theme`.
