PROJECT HISAAB: MASTER BLUEPRINT & ARCHITECTURE

Date: April 2026
Target Market: Indian MSMEs (Initial Wedge: Independent Clinics)
Core Value Proposition: A lightning-fast, offline-capable, GST-compliant billing PWA designed for Tier 2/3 Indian businesses.

1. STRATEGIC FOUNDATION (THE THREE PILLARS)

We identified three critical flaws in standard SaaS playbooks for the Indian MSME market and architected specific solutions:

Pillar 1: Monetization (The Feature-Gated Freemium)

The Problem: A strict 30-day trial locks users out of their financial history, creating "data hostage" anxiety that prevents initial adoption.

The Solution: Core GST billing and PDF generation are free forever. Users are never locked out of their ledger.

Premium Tier (₹199/mo or ₹1,499/yr): Unlocks custom business logos, staff/cashier accounts, GSTR Excel exports, and WhatsApp API delivery.

Pillar 2: Architecture (The Offline-First PWA)

The Problem: Tier 2/3 network drops (e.g., during busy clinic hours) block cloud-first software from generating bills, forcing users back to physical ledgers.

The Solution: A local-first Progressive Web App (PWA). The UI reads/writes to a local IndexedDB (Dexie.js/RxDB). Invoices are generated instantly offline. A background worker syncs to Supabase when the connection is restored.

Pillar 3: Distribution (The Micro-Niche Wedge)

The Problem: Relying on Chartered Accountants (CAs) for early distribution fails because CAs will not risk their licenses on unproven software.

The Solution: Target a highly specific local demographic first—independent medical practitioners (e.g., local clinics in Malegaon). Pre-load medical SAC codes (like 99931), rename "Clients" to "Patients," and pitch it directly to medical communities as a "practice management" tool.

2. TECHNICAL ARCHITECTURE

Frontend Framework: SvelteKit (optimized for SPA/PWA deployment)

Styling: Tailwind CSS

Local State / Sync: Dexie.js or RxDB

Backend Database: Supabase (PostgreSQL)

Authentication: Supabase Auth (Google OAuth + Email/Password)

Document Generation: jsPDF (Client-side execution for offline support)

Deployment: Cloudflare Pages (Static deployment with Service Workers)

3. OFFLINE-FIRST DATABASE SCHEMA (SUPABASE)

This schema guarantees sync safety. It uses UUIDs to prevent offline creation collisions, soft deletes to inform the server of removed records, and last_modified triggers for the sync engine.

-- 1. Timestamp Trigger Function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Businesses (Clinics)
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    gstin TEXT,
    state_code TEXT NOT NULL,
    invoice_counter INT DEFAULT 1,
    fy_start DATE NOT NULL,
    
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER update_businesses_modtime BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 3. Patients (Clients)
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    state_code TEXT NOT NULL,
    
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER update_patients_modtime BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 4. Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    
    invoice_number TEXT NOT NULL,
    issue_date DATE NOT NULL,
    tax_type TEXT NOT NULL CHECK (tax_type IN ('INTRA_STATE', 'INTER_STATE', 'EXEMPT')), 
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_tax NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL CHECK (status IN ('PAID', 'UNPAID', 'PARTIAL')),
    
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER update_invoices_modtime BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 5. Invoice Items
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    description TEXT NOT NULL,
    hsn_sac TEXT,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER update_invoice_items_modtime BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 6. Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    category TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    expense_date DATE NOT NULL,
    notes TEXT,
    
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER update_expenses_modtime BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_modified_column();


4. AI DEVELOPER INSTRUCTIONS

CLAUDE.md (Project Root)

# Hisaab - AI Developer Instructions

## Project Context
We are building "Hisaab," a web-first billing and practice management SaaS initially targeting independent medical clinics in India. 

**Core Differentiator:** It is an **offline-first Progressive Web App (PWA)**. Counter sales and invoice generation must work seamlessly without an internet connection, syncing in the background when connectivity returns.

## Tech Stack
* **Frontend:** SvelteKit (SPA mode/Adapter Static or Cloudflare depending on final deploy, but highly client-heavy for offline support).
* **Styling:** Tailwind CSS + standard accessible component library.
* **Backend/Auth:** Supabase (PostgreSQL + GoTrue Auth).
* **Local State / Sync:** Dexie.js (IndexedDB wrapper) or RxDB for local-first data storage.
* **PDF Generation:** `jsPDF` (Client/Server hybrid).

## Architectural Rules (NON-NEGOTIABLE)
1.  **Local-First Data Flow:** The UI *never* reads directly from Supabase for core application state. The UI reads from the local IndexedDB. Writes go to IndexedDB first, which instantly updates the UI. A background sync worker handles pushing/pulling to Supabase using `last_modified` timestamps.
2.  **UUIDs Only:** Never use `SERIAL` or auto-incrementing integers for IDs. All IDs must be UUID v4 generated on the *client* at the moment of creation to prevent sync collisions.
3.  **Soft Deletes:** Never run `DELETE` queries. Update the `is_deleted` boolean to `true` and update the `last_modified` timestamp. The UI must filter out `is_deleted = true`.
4.  **Supabase RLS:** Every Supabase query must execute securely. All tables have Row Level Security filtering by `business_id`. 
5.  **Currency Math:** Never use floating-point numbers for financial calculations. Use exact decimal logic (or integer cents if strict) to prevent rounding errors on GST math.
6.  **Environment Variables:** Use `$env/static/public` for browser-safe keys and `$env/static/private` for server-side secrets. Do not mix them.

## Communication Style
* No filler text.
* Do not guess. If a library lacks a feature needed for local-first sync, stop and ask the user for architectural direction.
* Do not write "placeholder" functions. Write the complete logic.


PHASE_1.md (Execution Plan)

# Hisaab V1 - Execution Plan

## Objective
Deploy a functional, offline-capable GST invoice generator tailored for a single medical clinic. 

## Step 1: Initialization & Local DB Setup
1.  Initialize a standard SvelteKit project with Tailwind CSS.
2.  Set up Dexie.js (or RxDB) for local data management.
3.  Create the local database schema mirroring the Supabase structure.
4.  Ensure all tables have `id` (UUID), `last_modified`, and `is_deleted` fields.
5.  Implement the local CRUD wrapper functions.

## Step 2: Supabase Auth & Schema
1.  Install `@supabase/supabase-js`.
2.  Implement Google OAuth and Email/Password sign-in.
3.  Apply the `001_init.sql` schema to the Supabase project.
4.  Configure Row Level Security (RLS) on Supabase: Users can only read/write data where the `business_id` belongs to them.

## Step 3: The Sync Engine (The Hard Part)
1.  Write a background synchronization class/store.
2.  **Push Logic:** Find all local records where `last_modified` is newer than the last successful sync timestamp. Upsert these to Supabase.
3.  **Pull Logic:** Query Supabase for records where `last_modified` is newer than the last successful sync. Upsert these into the local IndexedDB.
4.  Implement basic conflict resolution (server timestamp wins, or newest timestamp wins).

## Step 4: Core UI Development (Clinic Focus)
1.  **Dashboard:** Simple metrics reading from local DB.
2.  **Patients List:** View/Add/Edit patients (requires Name, Phone, State Code).
3.  **Invoice Builder UI:** * Select Patient.
    * Add Line Items (Description, HSN/SAC, Rate, Qty).
    * Implement GST calculation (CGST/SGST for intra-state, IGST for inter-state).
4.  **Settings:** Define Business Profile (Name, Clinic Logo, State Code, GSTIN).

## Step 5: PDF Generation & PWA
1.  Integrate `jsPDF` and create an offline-capable A4 invoice generator.
2.  Add `vite-plugin-pwa` to the build process.
3.  Configure the Service Worker to aggressively cache the JS/CSS bundle so the app loads instantly offline.



# Hisaab - AI Developer Instructions

## Project Context
We are building "Hisaab," a web-first billing and practice management SaaS initially targeting independent medical clinics in India. 

**Core Differentiator:** It is an **offline-first Progressive Web App (PWA)**. Counter sales and invoice generation must work seamlessly without an internet connection, syncing in the background when connectivity returns.

## Tech Stack
* **Frontend:** SvelteKit (SPA mode/Adapter Static or Cloudflare depending on final deploy, but highly client-heavy for offline support).
* **Styling:** Tailwind CSS + standard accessible component library (e.g., shadcn-svelte or skeleton).
* **Backend/Auth:** Supabase (PostgreSQL + GoTrue Auth).
* **Local State / Sync:** Dexie.js (IndexedDB wrapper) or RxDB for local-first data storage.
* **PDF Generation:** `jsPDF` (Client/Server hybrid).

## Architectural Rules (NON-NEGOTIABLE)
1.  **Local-First Data Flow:** The UI *never* reads directly from Supabase for core application state. The UI reads from the local IndexedDB. Writes go to IndexedDB first, which instantly updates the UI. A background sync worker handles pushing/pulling to Supabase using `last_modified` timestamps.
2.  **UUIDs Only:** Never use `SERIAL` or auto-incrementing integers for IDs. All IDs must be UUID v4 generated on the *client* at the moment of creation to prevent sync collisions.
3.  **Soft Deletes:** Never run `DELETE` queries. Update the `is_deleted` boolean to `true` and update the `last_modified` timestamp. The UI must filter out `is_deleted = true`.
4.  **Supabase RLS:** Every Supabase query must execute securely. All tables have Row Level Security filtering by `business_id`. 
5.  **Currency Math:** Never use floating-point numbers for financial calculations. Use exact decimal logic (or integer cents if strict) to prevent rounding errors on GST math.
6.  **Environment Variables:** Use `$env/static/public` for browser-safe keys and `$env/static/private` for server-side secrets. Do not mix them.

## Communication Style
* No filler text.
* Do not guess. If a library lacks a feature needed for local-first sync, stop and ask the user for architectural direction.
* Do not write "placeholder" functions. Write the complete logic.





# Hisaab V1 - Execution Plan

## Objective
Deploy a functional, offline-capable GST invoice generator tailored for a single medical clinic. 

## Step 1: Initialization & Local DB Setup
1.  Initialize a standard SvelteKit project with Tailwind CSS.
2.  Set up Dexie.js (or RxDB) for local data management.
3.  Create the local database schema mirroring the Supabase structure: `businesses`, `patients`, `invoices`, `invoice_items`, `expenses`. 
4.  Ensure all tables have `id` (UUID), `last_modified`, and `is_deleted` fields.
5.  Implement the local CRUD wrapper functions (e.g., `createPatient()`, `getInvoices()`).

## Step 2: Supabase Auth & Schema
1.  Install `@supabase/supabase-js`.
2.  Implement Google OAuth and Email/Password sign-in.
3.  Apply the `001_init.sql` schema to the Supabase project (schema includes UUID defaults, soft deletes, and timestamp triggers).
4.  Configure Row Level Security (RLS) on Supabase: Users can only read/write data where the `business_id` belongs to them.

## Step 3: The Sync Engine (The Hard Part)
1.  Write a background synchronization class/store.
2.  **Push Logic:** Find all local records where `last_modified` is newer than the last successful sync timestamp. Upsert these to Supabase.
3.  **Pull Logic:** Query Supabase for records where `last_modified` is newer than the last successful sync. Upsert these into the local IndexedDB.
4.  Implement basic conflict resolution (server timestamp wins, or newest timestamp wins).

## Step 4: Core UI Development (Clinic Focus)
1.  **Dashboard:** Simple metrics reading from local DB (Total Receivables, Recent Invoices).
2.  **Patients List:** View/Add/Edit patients (requires Name, Phone, State Code).
3.  **Invoice Builder UI:** * Select Patient.
    * Add Line Items (Description, HSN/SAC, Rate, Qty).
    * **Crucial Logic:** Implement the GST calculation. If Business `state_code` == Patient `state_code`, calculate CGST & SGST (half rate each). If different, calculate IGST (full rate).
4.  **Settings:** Define Business Profile (Name, Clinic Logo, State Code, GSTIN).

## Step 5: PDF Generation
1.  Integrate `jsPDF` and `jspdf-autotable`.
2.  Create a service that takes an Invoice object and generates a professional, clean A4 PDF.
3.  Ensure GST splits (CGST/SGST vs IGST) are clearly displayed in the invoice totals table.
4.  Make the PDF trigger a browser download immediately.

## Step 6: PWA Configuration
1.  Add `vite-plugin-pwa` to the build process.
2.  Configure the manifest (Name: Hisaab, Theme Color, Icons).
3.  Configure the Service Worker to aggressively cache the JS/CSS bundle so the app loads instantly offline.