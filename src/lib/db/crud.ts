import { db, type Business, type Patient, type Invoice, type InvoiceItem, type Expense } from './index';
import { generateId, now } from '$lib/utils/helpers';

// ─── Business CRUD ───────────────────────────────────────────────────────────

export async function createBusiness(data: Partial<Business>): Promise<Business> {
	const business: Business = {
		id: data.id || generateId(),
		owner_id: data.owner_id || '',
		name: data.name || '',
		gstin: data.gstin || '',
		state_code: data.state_code || '27',
		address: data.address || '',
		phone: data.phone || '',
		email: data.email || '',
		logo_base64: data.logo_base64 || '',
		invoice_counter: data.invoice_counter || 1,
		fy_start: data.fy_start || `${new Date().getFullYear()}-04-01`,
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.businesses.add(business);
	return business;
}

export async function getBusinesses(): Promise<Business[]> {
	return db.businesses.filter((b) => !b.is_deleted).toArray();
}

export async function getBusiness(id?: string): Promise<Business | undefined> {
	if (id) {
		const b = await db.businesses.get(id);
		return b && !b.is_deleted ? b : undefined;
	}
	// Fallback to the first available if no id is provided (useful for initial load)
	return db.businesses.filter((b) => !b.is_deleted).first();
}

export async function updateBusiness(id: string, data: Partial<Business>): Promise<void> {
	await db.businesses.update(id, { ...data, last_modified: now() });
}

// ─── Patient CRUD ────────────────────────────────────────────────────────────

export async function createPatient(businessId: string, data: Partial<Patient>): Promise<Patient> {
	const patient: Patient = {
		id: generateId(),
		business_id: businessId,
		name: data.name || '',
		phone: data.phone || '',
		email: data.email || '',
		address: data.address || '',
		state_code: data.state_code || '27',
		notes: data.notes || '',
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.patients.add(patient);
	return patient;
}

export async function getPatients(businessId: string): Promise<Patient[]> {
	return db.patients
		.where('business_id')
		.equals(businessId)
		.filter((p) => !p.is_deleted)
		.reverse()
		.sortBy('created_at');
}

export async function getPatient(id: string): Promise<Patient | undefined> {
	const p = await db.patients.get(id);
	return p && !p.is_deleted ? p : undefined;
}

export async function updatePatient(id: string, data: Partial<Patient>): Promise<void> {
	await db.patients.update(id, { ...data, last_modified: now() });
}

export async function softDeletePatient(id: string): Promise<void> {
	await db.patients.update(id, { is_deleted: true, last_modified: now() });
}

export async function searchPatients(businessId: string, query: string): Promise<Patient[]> {
	const q = query.toLowerCase();
	return db.patients
		.where('business_id')
		.equals(businessId)
		.filter((p) => !p.is_deleted && (p.name.toLowerCase().includes(q) || p.phone.includes(q)))
		.toArray();
}

export async function countPatients(businessId: string): Promise<number> {
	return db.patients
		.where('business_id')
		.equals(businessId)
		.filter((p) => !p.is_deleted)
		.count();
}

// ─── Invoice CRUD ────────────────────────────────────────────────────────────

export async function createInvoice(data: Omit<Invoice, 'id' | 'is_deleted' | 'created_at' | 'last_modified'>, items: Omit<InvoiceItem, 'id' | 'is_deleted' | 'created_at' | 'last_modified'>[]): Promise<Invoice> {
	const invoice: Invoice = {
		...data,
		id: generateId(),
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};

	const invoiceItems: InvoiceItem[] = items.map((item) => ({
		...item,
		id: generateId(),
		invoice_id: invoice.id,
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	}));

	await db.transaction('rw', db.invoices, db.invoice_items, db.businesses, async () => {
		await db.invoices.add(invoice);
		await db.invoice_items.bulkAdd(invoiceItems);
		// Increment the invoice counter
		const business = await db.businesses.get(invoice.business_id);
		if (business) {
			await db.businesses.update(business.id, {
				invoice_counter: business.invoice_counter + 1,
				last_modified: now()
			});
		}
	});

	return invoice;
}

export async function getInvoices(businessId: string): Promise<Invoice[]> {
	return db.invoices
		.where('business_id')
		.equals(businessId)
		.filter((i) => !i.is_deleted)
		.reverse()
		.sortBy('created_at');
}

export async function getInvoice(id: string): Promise<Invoice | undefined> {
	const inv = await db.invoices.get(id);
	return inv && !inv.is_deleted ? inv : undefined;
}

export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
	return db.invoice_items
		.where('invoice_id')
		.equals(invoiceId)
		.filter((ii) => !ii.is_deleted)
		.toArray();
}

export async function getInvoicesByPatient(patientId: string): Promise<Invoice[]> {
	return db.invoices
		.where('patient_id')
		.equals(patientId)
		.filter((i) => !i.is_deleted)
		.reverse()
		.sortBy('created_at');
}

export async function updateInvoiceStatus(id: string, status: Invoice['status']): Promise<void> {
	await db.invoices.update(id, { status, last_modified: now() });
}

export async function getOutstandingTotal(businessId: string): Promise<number> {
	const invoices = await db.invoices
		.where('business_id')
		.equals(businessId)
		.filter((i) => !i.is_deleted && i.status !== 'PAID')
		.toArray();
	return invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
}

export async function getRevenueTotal(businessId: string): Promise<number> {
	const invoices = await db.invoices
		.where('business_id')
		.equals(businessId)
		.filter((i) => !i.is_deleted)
		.toArray();
	return invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
}

export async function getRecentInvoices(businessId: string, limit: number = 5): Promise<(Invoice & { patient_name: string })[]> {
	const invoices = await db.invoices
		.where('business_id')
		.equals(businessId)
		.filter((i) => !i.is_deleted)
		.reverse()
		.sortBy('created_at');

	const recent = invoices.slice(0, limit);

	const enriched = await Promise.all(
		recent.map(async (inv) => {
			const patient = await db.patients.get(inv.patient_id);
			return { ...inv, patient_name: patient?.name || 'Unknown' };
		})
	);

	return enriched;
}

// ─── Expense CRUD ────────────────────────────────────────────────────────────

export async function createExpense(businessId: string, data: Partial<Expense>): Promise<Expense> {
	const expense: Expense = {
		id: generateId(),
		business_id: businessId,
		category: data.category || 'Others',
		description: data.description || '',
		amount: data.amount || 0,
		expense_date: data.expense_date || new Date().toISOString().split('T')[0],
		notes: data.notes || '',
		receipt_base64: data.receipt_base64 || '',
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.expenses.add(expense);
	return expense;
}

export async function getExpenses(businessId: string): Promise<Expense[]> {
	return db.expenses
		.where('business_id')
		.equals(businessId)
		.filter((e) => !e.is_deleted)
		.reverse()
		.sortBy('created_at');
}

export async function getExpensesByCategory(businessId: string): Promise<Record<string, number>> {
	const expenses = await getExpenses(businessId);
	const byCategory: Record<string, number> = {};
	for (const e of expenses) {
		byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
	}
	return byCategory;
}

export async function getExpenseTotal(businessId: string): Promise<number> {
	const expenses = await getExpenses(businessId);
	return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export async function softDeleteExpense(id: string): Promise<void> {
	await db.expenses.update(id, { is_deleted: true, last_modified: now() });
}

// ─── Analytics Queries ───────────────────────────────────────────────────────

export async function getRevenueByMonth(businessId: string, months: number = 12): Promise<{ label: string; value: number }[]> {
	const invoices = await db.invoices
		.where('business_id')
		.equals(businessId)
		.filter((i) => !i.is_deleted)
		.toArray();

	const now = new Date();
	const result: { label: string; value: number }[] = [];

	for (let i = months - 1; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
		const total = invoices
			.filter((inv) => inv.issue_date.startsWith(monthKey))
			.reduce((sum, inv) => sum + inv.grand_total, 0);
		result.push({ label, value: total });
	}
	return result;
}

export async function getExpensesByMonth(businessId: string, months: number = 12): Promise<{ label: string; value: number }[]> {
	const expenses = await db.expenses
		.where('business_id')
		.equals(businessId)
		.filter((e) => !e.is_deleted)
		.toArray();

	const now = new Date();
	const result: { label: string; value: number }[] = [];

	for (let i = months - 1; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
		const total = expenses
			.filter((exp) => exp.expense_date.startsWith(monthKey))
			.reduce((sum, exp) => sum + exp.amount, 0);
		result.push({ label, value: total });
	}
	return result;
}
