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
	}
}

export const db = new HisaabDB();
