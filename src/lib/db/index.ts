import Dexie, { type EntityTable } from 'dexie';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface Business {
	id: string;
	owner_id: string;
	name: string;
	gstin: string;
	state_code: string;
	address: string;
	phone: string;
	email: string;
	logo_base64: string;
	invoice_counter: number;
	fy_start: string; // ISO date string
	business_category: string; // e.g., "medical_clinic", "kirana_store"
	tax_registration_type: string; // "gst_registered" | "composition" | "unregistered"
	industry_sector: string; // e.g., "healthcare", "retail", "services"
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

export interface Patient {
	id: string;
	business_id: string;
	name: string;
	phone: string;
	email: string;
	address: string;
	state_code: string;
	notes: string;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

export interface Invoice {
	id: string;
	business_id: string;
	patient_id: string;
	invoice_number: string;
	issue_date: string; // ISO date string
	due_date: string;
	tax_type: 'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT';
	subtotal: number; // stored as integer paise (1 rupee = 100 paise)
	total_tax: number;
	grand_total: number;
	cgst: number;
	sgst: number;
	igst: number;
	status: 'PAID' | 'UNPAID' | 'PARTIAL';
	document_type?: 'INVOICE' | 'ESTIMATE' | 'PROFORMA' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
	linked_invoice_id?: string | null;
	notes: string;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

export interface InvoiceItem {
	id: string;
	invoice_id: string;
	description: string;
	hsn_sac: string;
	quantity: number; // stored as integer (x100 for 2 decimal places)
	rate: number; // stored as integer paise
	tax_rate: number; // stored as integer (x100, e.g. 1200 = 12.00%)
	amount: number; // rate * quantity in paise
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

export interface Expense {
	id: string;
	business_id: string;
	category: string;
	description: string;
	amount: number; // stored as integer paise
	expense_date: string;
	notes: string;
	receipt_base64: string;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

export interface Product {
	id: string;
	business_id: string;
	name: string;
	sku: string;
	hsn_sac: string;
	unit: string;
	selling_price: number; // stored as integer paise
	purchase_price: number; // stored as integer paise
	tax_rate: number; // stored as integer (x100)
	stock_quantity: number; // stored as integer (x100)
	low_stock_threshold: number; // stored as integer (x100)
	is_service: boolean;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

export interface Payment {
	id: string;
	business_id: string;
	patient_id: string; // Patient or Customer ID
	invoice_id: string; // Optional: Can be tied to a specific invoice or be an advance
	amount: number; // stored as integer paise
	payment_date: string; // ISO date string
	method: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
	reference: string; // UTR or transaction ID
	notes: string;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

export interface Supplier {
	id: string;
	business_id: string;
	name: string;
	phone: string;
	email: string;
	address: string;
	state_code: string;
	gstin: string;
	notes: string;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

export interface PurchaseOrder {
	id: string;
	business_id: string;
	supplier_id: string;
	po_number: string;
	issue_date: string;
	expected_date: string;
	status: 'DRAFT' | 'ISSUED' | 'RECEIVED' | 'CANCELLED';
	tax_type: 'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT';
	subtotal: number;
	total_tax: number;
	grand_total: number;
	cgst: number;
	sgst: number;
	igst: number;
	notes: string;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

export interface PurchaseOrderItem {
	id: string;
	po_id: string;
	product_id: string | null;
	description: string;
	hsn_sac: string;
	quantity: number;
	rate: number;
	tax_rate: number;
	amount: number;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

export interface PurchasePayment {
	id: string;
	business_id: string;
	supplier_id: string;
	po_id: string | null; // Optional: tied to specific PO or just an advance
	amount: number; // integer paise
	payment_date: string;
	method: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
	reference: string;
	notes: string;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

// ─── Recurring Schedules ─────────────────────────────────────────────────────

export interface RecurringSchedule {
	id: string;
	business_id: string;
	patient_id: string;
	template_invoice_data: Record<string, any>;
	template_items_data: Record<string, any>[];
	frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
	next_run: string;
	is_active: boolean;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

// ─── Sync Metadata ───────────────────────────────────────────────────────────

export interface SyncMeta {
	id: string;
	table_name: string;
	last_sync_at: string;
}

// ─── Database Class ──────────────────────────────────────────────────────────

class HisaabDB extends Dexie {
	businesses!: EntityTable<Business, 'id'>;
	patients!: EntityTable<Patient, 'id'>;
	invoices!: EntityTable<Invoice, 'id'>;
	invoice_items!: EntityTable<InvoiceItem, 'id'>;
	expenses!: EntityTable<Expense, 'id'>;
	products!: EntityTable<Product, 'id'>;
	payments!: EntityTable<Payment, 'id'>;
	suppliers!: EntityTable<Supplier, 'id'>;
	purchase_orders!: EntityTable<PurchaseOrder, 'id'>;
	purchase_order_items!: EntityTable<PurchaseOrderItem, 'id'>;
	purchase_payments!: EntityTable<PurchasePayment, 'id'>;
	recurring_schedules!: EntityTable<RecurringSchedule, 'id'>;
	sync_meta!: EntityTable<SyncMeta, 'id'>;

	constructor() {
		super('HisaabDB');

		this.version(1).stores({
			businesses: 'id, owner_id, name, is_deleted, last_modified',
			patients: 'id, business_id, name, phone, state_code, is_deleted, last_modified',
			invoices:
				'id, business_id, patient_id, invoice_number, issue_date, status, is_deleted, last_modified',
			invoice_items: 'id, invoice_id, is_deleted, last_modified',
			expenses: 'id, business_id, category, expense_date, is_deleted, last_modified',
			sync_meta: 'id, table_name'
		});

		this.version(2).stores({
			businesses: 'id, owner_id, name, business_category, tax_registration_type, is_deleted, last_modified'
		}).upgrade(tx => {
			return tx.table('businesses').toCollection().modify(business => {
				if (!business.business_category) business.business_category = 'medical_clinic';
				if (!business.tax_registration_type) business.tax_registration_type = 'unregistered';
				if (!business.industry_sector) business.industry_sector = 'healthcare';
			});
		});

		this.version(3).stores({
			products: 'id, business_id, name, sku, is_deleted, last_modified'
		});

		this.version(4).stores({
			payments: 'id, business_id, patient_id, invoice_id, payment_date, method, is_deleted, last_modified'
		});

		this.version(5).stores({
			suppliers: 'id, business_id, name, phone, state_code, is_deleted, last_modified',
			purchase_orders: 'id, business_id, supplier_id, po_number, issue_date, status, is_deleted, last_modified',
			purchase_order_items: 'id, po_id, product_id, is_deleted, last_modified'
		});

		this.version(6).stores({
			purchase_payments: 'id, business_id, supplier_id, po_id, payment_date, method, is_deleted, last_modified',
			invoices: 'id, business_id, patient_id, invoice_number, issue_date, status, document_type, is_deleted, last_modified'
		}).upgrade(tx => {
			// Phase 5 preparation: Add document_type to existing invoices
			return tx.table('invoices').toCollection().modify(inv => {
				if (!inv.document_type) inv.document_type = 'INVOICE';
				if (inv.linked_invoice_id === undefined) inv.linked_invoice_id = null;
			});
		});

		this.version(7).stores({
			recurring_schedules: 'id, business_id, patient_id, frequency, next_run, is_active, is_deleted, last_modified'
		});
	}
}

export const db = new HisaabDB();
