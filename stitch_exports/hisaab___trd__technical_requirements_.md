# Technical Requirements Document (TRD): Hisaab

**Project Name:** Hisaab  
**Architecture Style:** Offline-First PWA (Progressive Web App)  
**Security Level:** HIPAA-inspired (for medical data) & GST Compliant

---

## 1. Technology Stack
*   **Frontend:** SvelteKit (SPA Mode for client-side routing).
*   **Styling:** Tailwind CSS (Utility-first for rapid UI adaptation).
*   **Local Database:** Dexie.js (IndexedDB wrapper for robust client-side storage).
*   **Backend/API:** Supabase (Auth, PostgreSQL, Real-time sync).
*   **PDF Engine:** jsPDF + autoTable (Client-side execution).

## 2. System Architecture (Sync Engine)
The core of Hisaab is the **Local-First** data flow:
1.  **Write Path:** UI → Dexie.js (Local) → Success (Instant UI update).
2.  **Sync Path (Background):** Service Worker detects connection → Compares `last_modified` timestamps → Upserts local changes to Supabase → Pulls remote changes to Local.
3.  **Conflict Resolution:** Last-write-wins based on `last_modified` ISO timestamps.

## 3. Data Schema Principles
*   **UUIDs:** Every record (Invoices, Patients, Expenses) uses UUID v4 generated on the client to prevent ID collisions during offline creation.
*   **Soft Deletes:** Records are never physically deleted (`is_deleted: boolean`).
*   **State Awareness:** The app determines tax logic (Intra-state vs Inter-state) by comparing `business.state_code` with `customer.state_code` at the time of invoice creation.

## 4. Progressive Web App (PWA) Requirements
*   **Service Worker:** Aggressive caching of assets (JS, CSS, Fonts).
*   **Manifest:** Support for "Add to Home Screen" on Android/iOS.
*   **Offline UI:** Visible "Sync Status" indicator (Synced, Syncing, Offline).

## 5. Security & Compliance
*   **Row Level Security (RLS):** Supabase policies ensure a user can only access data where `business_id` matches their authenticated session.
*   **Data Integrity:** Financial calculations (GST) must use exact decimal arithmetic (avoiding JS float rounding errors).
*   **Encryption:** HTTPS for all transit; data at rest encrypted via Supabase (PostgreSQL).

## 6. Performance Targets
*   **First Contentful Paint (FCP):** < 1.2s (Cached).
*   **Invoice Generation Time:** < 500ms (Client-side).
*   **Sync Latency:** Background sync within 5s of restored connection.