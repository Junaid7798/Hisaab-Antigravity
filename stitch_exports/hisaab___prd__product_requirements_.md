# Product Requirements Document (PRD): Hisaab

**Project Name:** Hisaab (The Clinical & Business Architect)  
**Version:** 1.0  
**Status:** Finalized  
**Target Market:** Indian MSMEs (Initial focus: Medical Clinics, Retail, Freelancers)

---

## 1. Product Vision
To provide Indian micro-entrepreneurs with a lightning-fast, offline-capable, and GST-compliant billing solution that eliminates "data anxiety" and operational downtime caused by unstable internet.

## 2. Target Audience
*   **Medical Practitioners:** Independent clinics in Tier 2/3 cities needing practice management.
*   **Retailers:** Kirana and general stores requiring rapid counter-sales billing.
*   **Freelancers/Consultants:** Professionals needing simple, professional GST invoicing.

## 3. Core Features & User Stories

### A. Adaptive Onboarding & Multi-Business Support
*   **User Story:** As a user, I want to select my business type during onboarding so the app uses terminology (e.g., "Patients" vs. "Customers") and SAC/HSN codes relevant to me.
*   **Requirement:** Support for at least 10 business categories with profile switching capability.

### B. Offline-First Billing (GST Compliant)
*   **User Story:** As a shop owner, I want to generate a GST-compliant invoice even when my internet is down so I don't lose sales.
*   **Requirement:** Client-side PDF generation (A4/Thermal), automatic CGST/SGST vs. IGST calculation based on state codes.

### C. Financial Management (Ledger & Expenses)
*   **User Story:** As a clinic owner, I want to track my overheads (rent, supplies) alongside my revenue to see my true profit.
*   **Requirement:** Expense logging with categories, searchable patient/customer directory with outstanding balance tracking.

### D. Analytics & Reporting
*   **User Story:** As a business owner, I need a summary of my monthly GST liability to share with my CA.
*   **Requirement:** Monthly/Weekly revenue trends, GST summary report, Export to Excel (Premium).

## 4. Monetization (Freemium Model)
*   **Free Tier:** Unlimited billing, PDF generation, basic reports.
*   **Pro Tier (₹199/mo):** Custom branding/logos, WhatsApp delivery, Staff accounts, Advanced GSTR reports.

## 5. Success Metrics
*   **Offline Resilience:** % of invoices generated while offline.
*   **Retention:** Daily active usage (DAU) for ledger management.
*   **Conversion:** % of free users upgrading to Pro for WhatsApp/Branding features.