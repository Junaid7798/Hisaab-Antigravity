# PROJECT HISAAB: MASTER BLUEPRINT & ARCHITECTURE

Date: April 2026
Target Market: Indian MSMEs (Initial Wedge: Independent Clinics)
Core Value Proposition: A lightning-fast, offline-capable, GST-compliant billing PWA designed for Tier 2/3 Indian businesses.

## 1. STRATEGIC FOUNDATION (THE THREE PILLARS)

### Pillar 1: Monetization (The Feature-Gated Freemium)
*   **The Problem:** Strict 30-day trials lock users out of data, creating "data hostage" anxiety.
*   **The Solution:** Core GST billing and PDF generation are free forever. Users are never locked out of their ledger.
*   **Premium Tier (₹199/mo or ₹1,499/yr):** Custom business logos, staff accounts, GSTR Excel exports, and WhatsApp API delivery.

### Pillar 2: Architecture (The Offline-First PWA)
*   **The Problem:** Network drops in Tier 2/3 cities block cloud-first software during busy hours.
*   **The Solution:** Local-first PWA. UI reads/writes to local IndexedDB (Dexie.js). Syncs to Supabase when connection returns.

### Pillar 3: Distribution (The Micro-Niche Wedge)
*   **The Problem:** CAs won't risk licenses on unproven software.
*   **The Solution:** Target independent medical practitioners first. Pre-load medical SAC codes (99931), rename "Clients" to "Patients," and pitch as "practice management."

## 2. TECHNICAL ARCHITECTURE
*   **Frontend:** SvelteKit (SPA/PWA)
*   **Styling:** Tailwind CSS
*   **Local State / Sync:** Dexie.js or RxDB
*   **Backend:** Supabase (PostgreSQL)
*   **Auth:** Supabase Auth
*   **Document Generation:** jsPDF (Client-side)
*   **Deployment:** Cloudflare Pages

## 3. CORE UI SCREENS (PHASE 1)
1.  **Dashboard:** Metrics, total receivables, recent invoices.
2.  **Patients List:** View/Add/Edit patients (Name, Phone, State Code).
3.  **Invoice Builder:** GST-compliant calculation (CGST/SGST vs IGST), SAC codes.
4.  **Settings:** Business Profile, Logo, GSTIN, State Code.
5.  **Expenses:** Tracking clinic overheads.
