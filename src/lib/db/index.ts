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
	product_id?: string;
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

// ─── Staff & HR Management ──────────────────────────────────────────────────────────

export type StaffRole = 'admin' | 'store_manager' | 'cashier' | 'helper' | 'accountant';

export interface Staff {
	id: string;
	business_id: string;
	name: string;
	phone: string;
	email: string;
	role: StaffRole;
	date_of_joining: string;
	date_of_birth: string;
	address: string;
	aadhaar_number: string;
	pan_number: string;
	bank_account_number: string;
	bank_ifsc: string;
	bank_name: string;
	basic_salary: number;
	photo_base64: string;
	is_active: boolean;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

export interface StaffSalary {
	id: string;
	business_id: string;
	staff_id: string;
	month: number;
	year: number;
	basic_salary: number;
	bonus: number;
	deductions: number;
	net_salary: number;
	payment_date: string;
	payment_method: 'cash' | 'bank_transfer' | 'upi';
	remarks: string;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

export interface StaffAdvance {
	id: string;
	business_id: string;
	staff_id: string;
	amount: number;
	total_repaid: number;
	reason: string;
	request_date: string;
	approval_date: string;
	approval_by: string;
	status: 'pending' | 'approved' | 'rejected' | 'repaid';
	repayment_start_month: number;
	repayment_amount: number;
	repayment_installments: number;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

export interface StaffDocument {
	id: string;
	business_id: string;
	staff_id: string;
	document_type: 'aadhaar' | 'pan' | 'photo' | 'address_proof' | 'education' | 'experience' | 'other';
	file_name: string;
	file_type: string;
	file_size: number;
	base64_data: string;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

// ─── Attendance & Leave ───────────────────────────────────────────────────────────

export interface Attendance {
	id: string;
	business_id: string;
	staff_id: string;
	date: string;
	check_in: string;
	check_out: string;
	work_hours: number;
	late_by_minutes: number;
	status: 'present' | 'absent' | 'late' | 'leave';
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

export interface LeaveRequest {
	id: string;
	business_id: string;
	staff_id: string;
	leave_type: 'casual' | 'sick' | 'earned' | 'unpaid' | 'work_from_home';
	start_date: string;
	end_date: string;
	days_count: number;
	reason: string;
	status: 'pending' | 'approved' | 'rejected';
	approved_by: string;
	approval_date: string;
	is_deleted: boolean;
	created_at: string;
}

export interface LeaveBalance {
	id: string;
	business_id: string;
	staff_id: string;
	leave_type: 'casual' | 'sick' | 'earned';
	total_days: number;
	used_days: number;
	available_days: number;
	year: number;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

// ─── Tasks & Projects ───────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
	id: string;
	business_id: string;
	title: string;
	description: string;
	assigned_to: string;
	task_status: TaskStatus;
	task_priority: TaskPriority;
	due_date: string;
	completed_at: string;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

// ─── Production/MRP ───────────────────────────────────────────────────────────

export interface BOMItem {
	id: string;
	product_id: string;
	component_product_id: string;
	quantity_required: number;
	is_deleted: boolean;
}

export interface BOM {
	id: string;
	business_id: string;
	product_id: string;
	name: string;
	items: BOMItem[];
	is_active: boolean;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

// ─── Loan/Finance ───────────────────────────────────────────────────────────

export interface Loan {
	id: string;
	business_id: string;
	staff_id: string;
	loan_type: 'personal' | 'salary_advance' | 'emergency' | 'other';
	principal_amount: number;
	interest_rate: number;
	tenure_months: number;
	monthly_emi: number;
	total_interest: number;
	total_amount: number;
	amount_paid: number;
	amount_remaining: number;
	start_date: string;
	end_date: string;
	status: 'active' | 'completed' | 'defaulted';
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
}

// ─── Multi-branch ───────────────────────────────────────────────────────────

export interface Branch {
	id: string;
	business_id: string;
	name: string;
	address: string;
	phone: string;
	email: string;
	gstin: string;
	is_active: boolean;
	is_deleted: boolean;
	created_at: string;
	last_modified: string;
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
	staff!: EntityTable<Staff, 'id'>;
	staff_salaries!: EntityTable<StaffSalary, 'id'>;
	staff_advances!: EntityTable<StaffAdvance, 'id'>;
	staff_documents!: EntityTable<StaffDocument, 'id'>;
	attendance!: EntityTable<Attendance, 'id'>;
	leave_requests!: EntityTable<LeaveRequest, 'id'>;
	leave_balances!: EntityTable<LeaveBalance, 'id'>;
	tasks!: EntityTable<Task, 'id'>;
	bom!: EntityTable<BOM, 'id'>;
	loans!: EntityTable<Loan, 'id'>;
	branches!: EntityTable<Branch, 'id'>;

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
				if (!business.business_category) business.business_category = 'kirana_store';
				if (!business.tax_registration_type) business.tax_registration_type = 'unregistered';
				if (!business.industry_sector) business.industry_sector = 'retail';
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
			recurring_schedules: 'id, business_id, next_run, is_active, is_deleted'
		});

		this.version(9).stores({
			staff: 'id, business_id, name, phone, role, is_active, is_deleted',
			staff_salaries: 'id, business_id, staff_id, month, year, payment_date',
			staff_advances: 'id, business_id, staff_id, status, request_date',
			staff_documents: 'id, business_id, staff_id, document_type'
		});

		this.version(10).stores({
			attendance: 'id, business_id, staff_id, date, status',
			leave_requests: 'id, business_id, staff_id, status, start_date',
			leave_balances: 'id, business_id, staff_id, leave_type, year',
			tasks: 'id, business_id, assigned_to, task_status, task_priority, due_date',
			bom: 'id, business_id, product_id, is_active',
			loans: 'id, business_id, staff_id, status, start_date',
			branches: 'id, business_id, name, is_active'
		});
		this.version(11).stores({
			recurring_schedules: 'id, business_id, next_run, is_active, is_deleted, last_modified',
			staff: 'id, business_id, name, phone, role, is_active, is_deleted, last_modified',
			staff_salaries: 'id, business_id, staff_id, month, year, payment_date, is_deleted, last_modified',
			staff_advances: 'id, business_id, staff_id, status, request_date, is_deleted, last_modified',
			staff_documents: 'id, business_id, staff_id, document_type, is_deleted, last_modified',
			attendance: 'id, business_id, staff_id, date, status, is_deleted, last_modified',
			leave_requests: 'id, business_id, staff_id, status, start_date, is_deleted, last_modified',
			leave_balances: 'id, business_id, staff_id, leave_type, year, is_deleted, last_modified',
			tasks: 'id, business_id, assigned_to, task_status, task_priority, due_date, is_deleted, last_modified',
			bom: 'id, business_id, product_id, is_active, is_deleted, last_modified',
			loans: 'id, business_id, staff_id, status, start_date, is_deleted, last_modified',
			branches: 'id, business_id, name, is_active, is_deleted, last_modified'
		}).upgrade(tx => {
			const tablesToMigrate = [
				'recurring_schedules', 'staff', 'staff_salaries', 'staff_advances', 'staff_documents',
				'attendance', 'leave_requests', 'leave_balances', 'tasks', 'bom', 'loans', 'branches'
			];
			const nowStr = new Date().toISOString();
			
			return Promise.all(tablesToMigrate.map(tableName => {
				return tx.table(tableName).toCollection().modify(item => {
					if (item.is_deleted === undefined) item.is_deleted = false;
					if (!item.last_modified) item.last_modified = nowStr;
					if (!item.created_at) item.created_at = nowStr;
				});
			}));
		});

		this.version(12).stores({
			invoice_items: 'id, invoice_id, product_id, is_deleted, last_modified',
			patients: 'id, business_id, name, phone, email, state_code, is_deleted, last_modified',
			products: 'id, business_id, name, sku, hsn_sac, is_deleted, last_modified',
			staff: 'id, business_id, name, email, phone, role, is_active, is_deleted, last_modified'
		});
	}
}

export const db = new HisaabDB();
