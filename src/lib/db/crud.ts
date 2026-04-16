import { db, type Business, type Patient, type Invoice, type InvoiceItem, type Expense, type Product, type Payment, type Supplier, type PurchaseOrder, type PurchaseOrderItem, type PurchasePayment, type RecurringSchedule, type Staff, type StaffSalary, type StaffAdvance, type StaffDocument, type StaffRole, type Attendance, type LeaveRequest, type LeaveBalance, type Task, type TaskStatus, type TaskPriority, type Loan, type Branch, type BOM } from './index';
import { generateId, now } from '$lib/utils/helpers';
import { invalidateBusinessCache, getCachedBusiness } from '$lib/utils/cache';
import { generateInvoiceNumber } from '$lib/utils/invoice-number';
import { BusinessSchema, InvoiceSchema, ExpenseSchema, ProductSchema, PaymentSchema } from '$lib/utils/validators';
import { detectExpenseAnomaly, detectInvoiceAnomalies, detectDuplicateInvoice } from '$lib/utils/anomaly-detection';

export * from './crud-extended';

// ─── Business CRUD ───────────────────────────────────────────────────────────

export async function createBusiness(data: Partial<Business>): Promise<Business> {
	BusinessSchema.partial().parse(data);
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
		business_category: data.business_category || '',
		tax_registration_type: data.tax_registration_type || 'unregistered',
		industry_sector: data.industry_sector || '',
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
	// Invalidate cache for this business
	invalidateBusinessCache(businessId);
	return patient;
}

export async function getPatients(businessId: string): Promise<Patient[]> {
	const list = await db.patients
		.where('business_id')
		.equals(businessId)
		.filter((p) => !p.is_deleted)
		.sortBy('created_at');
	return list.reverse();
}

export async function getPatient(id: string): Promise<Patient | undefined> {
	const p = await db.patients.get(id);
	return p && !p.is_deleted ? p : undefined;
}

export async function updatePatient(id: string, data: Partial<Patient>): Promise<void> {
	await db.patients.update(id, { ...data, last_modified: now() });
}

export async function softDeletePatient(id: string): Promise<void> {
	const __record = await db.patients.get(id);
	if (__record) invalidateBusinessCache(__record.business_id);
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
	InvoiceSchema.partial().parse(data);
	const anomalies = await detectInvoiceAnomalies(data, items);
	if (anomalies.length > 0) {
		console.warn('Invoice Anomalies Detected:', anomalies);
	}
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

	await db.transaction('rw', db.invoices, db.invoice_items, db.businesses, db.products, async () => {
		await db.invoices.add(invoice);
		await db.invoice_items.bulkAdd(invoiceItems);
		
		// Deduct stock if it's an INVOICE
		if (invoice.document_type === 'INVOICE') {
			const allProducts = await db.products.where('business_id').equals(invoice.business_id).toArray();
			for (const item of invoiceItems) {
				const product = item.product_id 
					? allProducts.find(p => p.id === item.product_id)
					: allProducts.find(p => p.name === item.description);
					
				if (product && !product.is_service) {
					const dbProduct = await db.products.get(product.id);
					if (dbProduct) {
						const newStock = Math.max(0, dbProduct.stock_quantity - item.quantity);
						await db.products.update(dbProduct.id, { stock_quantity: newStock, last_modified: now() });
					}
				}
			}
		}

		// Increment the invoice counter
		const business = await db.businesses.get(invoice.business_id);
		if (business) {
			await db.businesses.update(business.id, {
				invoice_counter: business.invoice_counter + 1,
				last_modified: now()
			});
		}
	});

	// Invalidate cache for this business
	invalidateBusinessCache(invoice.business_id);

	return invoice;
}

export async function updateInvoice(id: string, data: Partial<Omit<Invoice, 'id' | 'is_deleted' | 'created_at' | 'last_modified'>>, items: Omit<InvoiceItem, 'id' | 'is_deleted' | 'created_at' | 'last_modified' | 'invoice_id'>[]): Promise<void> {
	InvoiceSchema.partial().parse(data);
	const existingInvoiceTemp = await db.invoices.get(id);
	if (existingInvoiceTemp) {
		const anomalies = await detectInvoiceAnomalies({ ...existingInvoiceTemp, ...data }, items);
		if (anomalies.length > 0) console.warn('Invoice Anomalies Detected during update:', anomalies);
	}

	await db.transaction('rw', db.invoices, db.invoice_items, db.products, async () => {
		const existingInvoice = await db.invoices.get(id);
		if (!existingInvoice) return;

		const isInvoiceDoc = data.document_type === 'INVOICE' || 
							 (data.document_type === undefined && existingInvoice.document_type === 'INVOICE');

		// Restore old stock if existing document is INVOICE
		if (existingInvoice.document_type === 'INVOICE') {
			const oldItems = await db.invoice_items.where('invoice_id').equals(id).toArray();
			const allProducts = await db.products.where('business_id').equals(existingInvoice.business_id).toArray();
			
			for (const item of oldItems) {
				const product = item.product_id 
					? allProducts.find(p => p.id === item.product_id)
					: allProducts.find(p => p.name === item.description);
				if (product && !product.is_service) {
					const dbProduct = await db.products.get(product.id);
					if (dbProduct) {
						await db.products.update(dbProduct.id, { 
							stock_quantity: dbProduct.stock_quantity + item.quantity, 
							last_modified: now() 
						});
					}
				}
			}
		}

		// Update main invoice data
		await db.invoices.update(id, {
			...data,
			last_modified: now()
		});

		// Replace items: Delete old, add new
		const oldItems = await db.invoice_items.where('invoice_id').equals(id).toArray();
		const oldItemIds = oldItems.map(i => i.id);
		await db.invoice_items.bulkDelete(oldItemIds);

		const updatedItems: InvoiceItem[] = items.map((item) => ({
			...item,
			id: generateId(),
			invoice_id: id,
			is_deleted: false,
			created_at: now(),
			last_modified: now()
		}));

		await db.invoice_items.bulkAdd(updatedItems);
		
		// Deduct new stock
		if (isInvoiceDoc) {
			const allProducts = await db.products.where('business_id').equals(existingInvoice.business_id).toArray();
			for (const item of updatedItems) {
				const product = item.product_id 
					? allProducts.find(p => p.id === item.product_id)
					: allProducts.find(p => p.name === item.description);
				
				if (product && !product.is_service) {
					const dbProduct = await db.products.get(product.id);
					if (dbProduct) {
						const newStock = Math.max(0, dbProduct.stock_quantity - item.quantity);
						await db.products.update(dbProduct.id, { stock_quantity: newStock, last_modified: now() });
					}
				}
			}
		}
	});
}

export async function softDeleteInvoice(id: string): Promise<void> {
	await db.transaction('rw', db.invoices, db.invoice_items, db.products, async () => {
		const invoice = await db.invoices.get(id);
		if (!invoice || invoice.is_deleted) return;
		
		if (invoice.document_type === 'INVOICE') {
			const items = await db.invoice_items.where('invoice_id').equals(id).toArray();
			const allProducts = await db.products.where('business_id').equals(invoice.business_id).toArray();
			
			for (const item of items) {
				const product = item.product_id 
					? allProducts.find(p => p.id === item.product_id)
					: allProducts.find(p => p.name === item.description);
				
				if (product && !product.is_service) {
					const dbProduct = await db.products.get(product.id);
					if (dbProduct) {
						await db.products.update(dbProduct.id, { 
							stock_quantity: dbProduct.stock_quantity + item.quantity, 
							last_modified: now() 
						});
					}
				}
			}
		}
		
		await db.invoices.update(id, { is_deleted: true, last_modified: now() });
	});
}

export async function convertEstimateToInvoice(estimateId: string): Promise<Invoice> {
	const estimate = await getInvoice(estimateId);
	if (!estimate || estimate.document_type !== 'ESTIMATE') throw new Error('Invalid estimate');
	
	const estItems = await getInvoiceItems(estimateId);
	const business = await db.businesses.get(estimate.business_id);
	if (!business) throw new Error('Business not found');

	const { generateInvoiceNumber } = await import('$lib/utils/invoice-number');
	const invoiceNumber = generateInvoiceNumber(business.invoice_counter);

	const newInvoice: Invoice = {
		...estimate,
		id: generateId(),
		invoice_number: invoiceNumber,
		document_type: 'INVOICE',
		status: 'UNPAID', // Start as unpaid upon conversion
		issue_date: new Date().toISOString().split('T')[0], // Convert today
		due_date: new Date().toISOString().split('T')[0],
		created_at: now(),
		last_modified: now()
	};

	const newItems: InvoiceItem[] = estItems.map(item => ({
		...item,
		id: generateId(),
		invoice_id: newInvoice.id,
		created_at: now(),
		last_modified: now()
	}));

	await db.transaction('rw', db.invoices, db.invoice_items, db.businesses, db.products, async () => {
		// Deduct stock since it is now officially a sale — match products by description
		const allProducts = await db.products.where('business_id').equals(estimate.business_id).toArray();
		for (const item of estItems) {
			const product = allProducts.find(p => p.name === item.description);
			if (product && !product.is_service) {
				const deduction = item.quantity;
				const newStock = Math.max(0, product.stock_quantity - deduction);
				await db.products.update(product.id, { stock_quantity: newStock, last_modified: now() });
			}
		}

		await db.invoices.add(newInvoice);
		await db.invoice_items.bulkAdd(newItems);
		await db.businesses.update(business.id, {
			invoice_counter: business.invoice_counter + 1,
			last_modified: now()
		});
	});

	return newInvoice;
}

export async function getInvoices(businessId: string): Promise<Invoice[]> {
	const list = await db.invoices
		.where('business_id')
		.equals(businessId)
		.filter((i) => !i.is_deleted)
		.sortBy('created_at');
	return list.reverse();
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
	const __record = await db.invoices.get(id);
	if (__record) invalidateBusinessCache(__record.business_id);
	await db.invoices.update(id, { status, last_modified: now() });
}

export async function getOutstandingTotal(businessId: string): Promise<number> {
	const invoices = await db.invoices
		.where('business_id')
		.equals(businessId)
		.filter((i) => !i.is_deleted && i.document_type === 'INVOICE')
		.toArray();
	const totalBilled = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
	
	const payments = await db.payments
		.where('business_id')
		.equals(businessId)
		.filter((p) => !p.is_deleted && !!p.invoice_id)
		.toArray();
	
	const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
	
	return totalBilled - totalPaid;
}

export async function getRevenueTotal(businessId: string): Promise<number> {
	const invoices = await db.invoices
		.where('business_id')
		.equals(businessId)
		.filter((i) => !i.is_deleted && i.document_type === 'INVOICE')
		.toArray();
	return invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
}

export async function getDashboardAlerts(businessId: string): Promise<{
    lowStock: Product[];
    overdueInvoices: Invoice[];
    revenueChangePercentage: number | null;
}> {
    // 1. Low stock
    const lowStock = await db.products
        .where('business_id').equals(businessId)
        .filter(p => !p.is_deleted && !p.is_service && p.stock_quantity <= p.low_stock_threshold)
        .toArray();

    // 2. Overdue Invoices
    const today = new Date().toISOString().split('T')[0];
    const overdueInvoices = await db.invoices
        .where('business_id').equals(businessId)
        .filter(i => !i.is_deleted && i.document_type === 'INVOICE' && i.status !== 'PAID' && !!i.due_date && i.due_date < today)
        .toArray();

    // 3. MoM Revenue Change
    const currentMonthPrefix = today.substring(0, 7); // YYYY-MM
    let lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthPrefix = lastMonthDate.toISOString().substring(0, 7);

    const invoices = await db.invoices
        .where('business_id').equals(businessId)
        .filter(i => !i.is_deleted && i.document_type === 'INVOICE')
        .toArray();

    let currReq = 0;
    let prevReq = 0;
    for (const inv of invoices) {
        if (inv.issue_date.startsWith(currentMonthPrefix)) currReq += inv.grand_total;
        if (inv.issue_date.startsWith(lastMonthPrefix)) prevReq += inv.grand_total;
    }

    let revenueChangePercentage = null;
    if (prevReq > 0) {
        revenueChangePercentage = ((currReq - prevReq) / prevReq) * 100;
    } else if (currReq > 0) {
        revenueChangePercentage = 100;
    }

    return {
        lowStock,
        overdueInvoices,
        revenueChangePercentage
    };
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
	ExpenseSchema.partial().parse(data);
	const anomalies = await detectExpenseAnomaly({ ...data, business_id: businessId });
	if (anomalies.length > 0) console.warn('Expense Anomalies Detected:', anomalies);
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
	invalidateBusinessCache(businessId);
	return expense;
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
	const existing = await db.expenses.get(id);
	if (existing) {
		await db.expenses.update(id, { ...data, last_modified: now() });
		invalidateBusinessCache(existing.business_id);
	}
}

export async function getExpenses(businessId: string): Promise<Expense[]> {
	const list = await db.expenses
		.where('business_id')
		.equals(businessId)
		.filter((e) => !e.is_deleted)
		.sortBy('created_at');
	return list.reverse();
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
	const __record = await db.expenses.get(id);
	if (__record) invalidateBusinessCache(__record.business_id);
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

// ─── Product CRUD ────────────────────────────────────────────────────────────

export async function createProduct(businessId: string, data: Partial<Product>): Promise<Product> {
	ProductSchema.partial().parse(data);
	const product: Product = {
		id: generateId(),
		business_id: businessId,
		name: data.name || '',
		sku: data.sku || '',
		hsn_sac: data.hsn_sac || '',
		unit: data.unit || 'pcs',
		selling_price: data.selling_price || 0,
		purchase_price: data.purchase_price || 0,
		tax_rate: data.tax_rate || 0,
		stock_quantity: data.stock_quantity || 0,
		low_stock_threshold: data.low_stock_threshold || 1000,
		is_service: data.is_service ?? false,
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.products.add(product);
	// Invalidate cache for this business
	invalidateBusinessCache(businessId);
	return product;
}

export async function getProducts(businessId: string): Promise<Product[]> {
	const list = await db.products
		.where('business_id')
		.equals(businessId)
		.filter((p) => !p.is_deleted)
		.sortBy('created_at');
	return list.reverse();
}

export async function getProduct(id: string): Promise<Product | undefined> {
	const p = await db.products.get(id);
	return p && !p.is_deleted ? p : undefined;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
	await db.products.update(id, { ...data, last_modified: now() });
}

export async function softDeleteProduct(id: string): Promise<void> {
	const __record = await db.products.get(id);
	if (__record) invalidateBusinessCache(__record.business_id);
	await db.products.update(id, { is_deleted: true, last_modified: now() });
}

export async function countProducts(businessId: string): Promise<number> {
	return db.products
		.where('business_id')
		.equals(businessId)
		.filter((p) => !p.is_deleted)
		.count();
}

export async function countLowStockProducts(businessId: string): Promise<number> {
	return db.products
		.where('business_id')
		.equals(businessId)
		.filter((p) => !p.is_deleted && !p.is_service && p.stock_quantity <= p.low_stock_threshold)
		.count();
}

// ─── Payment CRUD ────────────────────────────────────────────────────────────

export async function createPayment(businessId: string, data: Partial<Payment>): Promise<Payment> {
	// Validate invoice_id if provided
	if (data.invoice_id) {
		const inv = await db.invoices.get(data.invoice_id);
		if (!inv || inv.is_deleted) {
			throw new Error('Invalid invoice_id: invoice does not exist');
		}
	}

	const payment: Payment = {
		id: generateId(),
		business_id: businessId,
		patient_id: data.patient_id || '',
		invoice_id: data.invoice_id || '',
		amount: data.amount || 0,
		payment_date: data.payment_date || new Date().toISOString().split('T')[0],
		method: data.method || 'CASH',
		reference: data.reference || '',
		notes: data.notes || '',
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.payments.add(payment);
	invalidateBusinessCache(businessId);
	return payment;
}

export async function getPayments(businessId: string): Promise<Payment[]> {
	const list = await db.payments
		.where('business_id')
		.equals(businessId)
		.filter((p) => !p.is_deleted)
		.sortBy('created_at');
	return list.reverse();
}

export async function getPaymentsByPatient(patientId: string): Promise<Payment[]> {
	return db.payments
		.where('patient_id')
		.equals(patientId)
		.filter((p) => !p.is_deleted)
		.reverse()
		.sortBy('payment_date');
}

export async function getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
	return db.payments
		.where('invoice_id')
		.equals(invoiceId)
		.filter((p) => !p.is_deleted)
		.reverse()
		.sortBy('payment_date');
}

export async function getPaymentTotalForInvoice(invoiceId: string): Promise<number> {
	const payments = await getPaymentsByInvoice(invoiceId);
	return payments.reduce((sum, p) => sum + p.amount, 0);
}

export async function getPaymentTotalForPatient(patientId: string): Promise<number> {
	const payments = await getPaymentsByPatient(patientId);
	return payments.reduce((sum, p) => sum + p.amount, 0);
}

export async function softDeletePayment(id: string): Promise<void> {
	const __record = await db.payments.get(id);
	if (__record) invalidateBusinessCache(__record.business_id);
	await db.payments.update(id, { is_deleted: true, last_modified: now() });
}

// ─── Supplier CRUD ───────────────────────────────────────────────────────────

export async function createSupplier(data: Partial<Supplier>, businessId: string): Promise<Supplier> {
	const supplier: Supplier = {
		id: generateId(),
		business_id: businessId,
		name: data.name || '',
		phone: data.phone || '',
		email: data.email || '',
		address: data.address || '',
		state_code: data.state_code || '27',
		gstin: data.gstin || '',
		notes: data.notes || '',
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.suppliers.add(supplier);
	return supplier;
}

export async function updateSupplier(id: string, data: Partial<Supplier>): Promise<void> {
	await db.suppliers.update(id, {
		...data,
		last_modified: now()
	});
}

export async function getSuppliers(businessId: string): Promise<Supplier[]> {
	const list = await db.suppliers
		.where('business_id')
		.equals(businessId)
		.filter((s) => !s.is_deleted)
		.sortBy('created_at');
	return list.reverse();
}

export async function getSupplier(id: string): Promise<Supplier | undefined> {
	const s = await db.suppliers.get(id);
	return s && !s.is_deleted ? s : undefined;
}

// ─── Purchase Order CRUD ─────────────────────────────────────────────────────

export async function createPurchaseOrder(data: Partial<PurchaseOrder>, items: Partial<PurchaseOrderItem>[], businessId: string): Promise<PurchaseOrder> {
	const poId = generateId();
	const po: PurchaseOrder = {
		id: poId,
		business_id: businessId,
		supplier_id: data.supplier_id || '',
		po_number: data.po_number || `PO-${Date.now()}`,
		issue_date: data.issue_date || now().split('T')[0],
		expected_date: data.expected_date || '',
		status: data.status || 'DRAFT',
		tax_type: data.tax_type || 'INTRA_STATE',
		subtotal: data.subtotal || 0,
		total_tax: data.total_tax || 0,
		grand_total: data.grand_total || 0,
		cgst: data.cgst || 0,
		sgst: data.sgst || 0,
		igst: data.igst || 0,
		notes: data.notes || '',
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};

	const poItems: PurchaseOrderItem[] = items.map((item) => ({
		id: generateId(),
		po_id: poId,
		product_id: item.product_id || null,
		description: item.description || '',
		hsn_sac: item.hsn_sac || '',
		quantity: item.quantity || 1,
		rate: item.rate || 0,
		tax_rate: item.tax_rate || 0,
		amount: item.amount || 0,
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	}));

	await db.transaction('rw', db.purchase_orders, db.purchase_order_items, db.products, async () => {
		await db.purchase_orders.add(po);
		await db.purchase_order_items.bulkAdd(poItems);
		
		// If creating a PO that is immediately RECEIVED, increment stock
		if (po.status === 'RECEIVED') {
			for (const item of poItems) {
				if (item.product_id) {
					const prod = await db.products.get(item.product_id);
					if (prod) {
						await db.products.update(prod.id, {
							stock_quantity: prod.stock_quantity + item.quantity,
							last_modified: now()
						});
					}
				}
			}
		}
	});

	return po;
}

export async function updatePurchaseOrderStatus(poId: string, newStatus: PurchaseOrder['status']): Promise<void> {
	await db.transaction('rw', db.purchase_orders, db.purchase_order_items, db.products, async () => {
		const po = await db.purchase_orders.get(poId);
		if (!po) return;

		// Deduct stock if un-receiving
		if (po.status === 'RECEIVED' && newStatus !== 'RECEIVED') {
			const items = await getPurchaseOrderItems(poId);
			for (const item of items) {
				if (item.product_id) {
					const prod = await db.products.get(item.product_id);
					if (prod) {
						await db.products.update(prod.id, {
							stock_quantity: Math.max(0, prod.stock_quantity - item.quantity),
							last_modified: now()
						});
					}
				}
			}
		}

		// Increment stock if receiving now
		if (po.status !== 'RECEIVED' && newStatus === 'RECEIVED') {
			const items = await getPurchaseOrderItems(poId);
			for (const item of items) {
				if (item.product_id) {
					const prod = await db.products.get(item.product_id);
					if (prod) {
						await db.products.update(prod.id, {
							stock_quantity: prod.stock_quantity + item.quantity,
							last_modified: now()
						});
					}
				}
			}
		}

		await db.purchase_orders.update(poId, { status: newStatus, last_modified: now() });
	});
}

export async function getPurchaseOrders(businessId: string): Promise<PurchaseOrder[]> {
	const list = await db.purchase_orders
		.where('business_id')
		.equals(businessId)
		.filter((po) => !po.is_deleted)
		.sortBy('created_at');
	return list.reverse();
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
	const po = await db.purchase_orders.get(id);
	return po && !po.is_deleted ? po : undefined;
}

export async function getPurchaseOrderItems(poId: string): Promise<PurchaseOrderItem[]> {
	return db.purchase_order_items
		.where('po_id')
		.equals(poId)
		.filter((item) => !item.is_deleted)
		.sortBy('created_at');
}

export async function getPurchaseOrdersBySupplier(supplierId: string): Promise<PurchaseOrder[]> {
	return db.purchase_orders
		.where('supplier_id')
		.equals(supplierId)
		.filter((po) => !po.is_deleted)
		.reverse()
		.sortBy('issue_date');
}

// ─── Purchase Payment CRUD ────────────────────────────────────────────────────

export async function createPurchasePayment(data: Partial<PurchasePayment>, businessId: string): Promise<PurchasePayment> {
	const payment: PurchasePayment = {
		id: generateId(),
		business_id: businessId,
		supplier_id: data.supplier_id || '',
		po_id: data.po_id || null,
		amount: data.amount || 0,
		payment_date: data.payment_date || new Date().toISOString().split('T')[0],
		method: data.method || 'CASH',
		reference: data.reference || '',
		notes: data.notes || '',
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.purchase_payments.add(payment);
	return payment;
}

export async function getPurchasePaymentsBySupplier(supplierId: string): Promise<PurchasePayment[]> {
	return db.purchase_payments
		.where('supplier_id')
		.equals(supplierId)
		.filter((p) => !p.is_deleted)
		.reverse()
		.sortBy('payment_date');
}

export async function getPurchasePaymentTotalForSupplier(supplierId: string): Promise<number> {
	const payments = await getPurchasePaymentsBySupplier(supplierId);
	return payments.reduce((sum, p) => sum + p.amount, 0);
}

// ─── Recurring Schedules (Phase 7) ──────────────────────────────────────────

export async function createRecurringSchedule(data: Partial<RecurringSchedule>): Promise<RecurringSchedule> {
	const schedule: RecurringSchedule = {
		id: generateId(),
		business_id: data.business_id || '',
		patient_id: data.patient_id || '',
		template_invoice_data: data.template_invoice_data!,
		template_items_data: data.template_items_data || [],
		frequency: data.frequency || 'MONTHLY',
		next_run: data.next_run || new Date().toISOString().split('T')[0],
		is_active: data.is_active !== undefined ? data.is_active : true,
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.recurring_schedules.add(schedule);
	return schedule;
}

export async function getRecurringSchedules(businessId: string): Promise<RecurringSchedule[]> {
	return db.recurring_schedules
		.where('business_id')
		.equals(businessId)
		.filter(rs => !rs.is_deleted)
		.toArray();
}

export async function updateRecurringSchedule(id: string, updates: Partial<RecurringSchedule>): Promise<void> {
	await db.recurring_schedules.update(id, {
		...updates,
		last_modified: now()
	});
}

export async function deleteRecurringSchedule(id: string): Promise<void> {
	await db.recurring_schedules.update(id, {
		is_deleted: true,
		last_modified: now()
	});
}

export async function processRecurringSchedules(): Promise<void> {
	if (typeof navigator === 'undefined' || !navigator.locks) {
		await __processRecurringSchedulesInternal();
		return;
	}
	
	// Cross-tab lock to prevent duplicate invoice generation
	await navigator.locks.request('hisaab_recurring_schedule_lock', { mode: 'exclusive' }, async () => {
		await __processRecurringSchedulesInternal();
	});
}

async function __processRecurringSchedulesInternal(): Promise<void> {
	const todayDate = new Date().toISOString().split('T')[0];
	
	const activeSchedules = await db.recurring_schedules
		.filter(rs => !rs.is_deleted && rs.is_active && rs.next_run <= todayDate)
		.toArray();

	for (const schedule of activeSchedules) {
		const business = await db.businesses.get(schedule.business_id);
		if (!business) continue; // Should not happen, but safe

		// 2. Create Invoice Transaction
		await db.transaction('rw', db.invoices, db.invoice_items, db.businesses, db.recurring_schedules, async () => {
			// Re-verify inside the transaction to ensure it wasn't processed precisely before us
			const verifySchedule = await db.recurring_schedules.get(schedule.id);
			if (!verifySchedule || verifySchedule.is_deleted || !verifySchedule.is_active || verifySchedule.next_run > todayDate) {
				return; // Already processed
			}

			// 1. Generate Invoice Number inside transaction for safety
			const freshBusiness = await db.businesses.get(schedule.business_id);
			if (!freshBusiness) return;
			const nextCounter = freshBusiness.invoice_counter + 1;
			const invoiceNumber = generateInvoiceNumber(nextCounter);

			const invData = schedule.template_invoice_data;
			
			const invoiceId = generateId();
			await db.invoices.add({
				...invData,
				id: invoiceId,
				business_id: schedule.business_id,
				patient_id: schedule.patient_id,
				invoice_number: invoiceNumber,
				issue_date: todayDate,
				due_date: todayDate,
				status: 'UNPAID',
				document_type: 'INVOICE',
				linked_invoice_id: null,
				is_deleted: false,
				created_at: now(),
				last_modified: now()
			});

			const items = schedule.template_items_data.map(ti => ({
				...ti,
				id: generateId(),
				invoice_id: invoiceId,
				is_deleted: false,
				created_at: now(),
				last_modified: now()
			} as InvoiceItem));

			if (items.length > 0) {
				await db.invoice_items.bulkAdd(items);
			}

			await db.businesses.update(freshBusiness.id, {
				invoice_counter: nextCounter,
				last_modified: now()
			});

			// 3. Advance next_run limit based on frequency
			const d = new Date(todayDate);
			if (schedule.frequency === 'WEEKLY') {
				d.setDate(d.getDate() + 7);
			} else if (schedule.frequency === 'MONTHLY') {
				d.setMonth(d.getMonth() + 1);
			} else if (schedule.frequency === 'QUARTERLY') {
				d.setMonth(d.getMonth() + 3);
			} else if (schedule.frequency === 'YEARLY') {
				d.setFullYear(d.getFullYear() + 1);
			}

			await db.recurring_schedules.update(schedule.id, {
				next_run: d.toISOString().split('T')[0],
				last_modified: now()
			});
		});
	}
}

// ─── Staff HR Management CRUD ───────────────────────────────────────────────────────────

export async function createStaff(businessId: string, data: Partial<Staff>): Promise<Staff> {
	const staff: Staff = {
		id: generateId(),
		business_id: businessId,
		name: data.name || '',
		phone: data.phone || '',
		email: data.email || '',
		role: data.role || 'helper',
		date_of_joining: data.date_of_joining || now().split('T')[0],
		date_of_birth: data.date_of_birth || '',
		address: data.address || '',
		aadhaar_number: data.aadhaar_number || '',
		pan_number: data.pan_number || '',
		bank_account_number: data.bank_account_number || '',
		bank_ifsc: data.bank_ifsc || '',
		bank_name: data.bank_name || '',
		basic_salary: data.basic_salary || 0,
		photo_base64: data.photo_base64 || '',
		is_active: true,
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.staff.add(staff);
	return staff;
}

export async function getStaff(businessId: string): Promise<Staff[]> {
	return db.staff
		.where('business_id')
		.equals(businessId)
		.filter(s => !s.is_deleted)
		.sortBy('name');
}

export async function getStaffById(id: string): Promise<Staff | undefined> {
	const s = await db.staff.get(id);
	return s && !s.is_deleted ? s : undefined;
}

export async function updateStaff(id: string, data: Partial<Staff>): Promise<void> {
	await db.staff.update(id, { ...data, last_modified: now() });
}

export async function softDeleteStaff(id: string): Promise<void> {
	await db.staff.update(id, { is_deleted: true, last_modified: now() });
}

export async function getActiveStaff(businessId: string): Promise<Staff[]> {
	return db.staff
		.where('business_id')
		.equals(businessId)
		.filter(s => !s.is_deleted && s.is_active)
		.sortBy('name');
}

export async function getStaffByRole(businessId: string, role: StaffRole): Promise<Staff[]> {
	return db.staff
		.where('business_id')
		.equals(businessId)
		.filter(s => !s.is_deleted && s.is_active && s.role === role)
		.sortBy('name');
}

// Salary functions
export async function createStaffSalary(businessId: string, data: Partial<StaffSalary>): Promise<StaffSalary> {
	const salary: StaffSalary = {
		id: generateId(),
		business_id: businessId,
		staff_id: data.staff_id || '',
		month: data.month || new Date().getMonth() + 1,
		year: data.year || new Date().getFullYear(),
		basic_salary: data.basic_salary || 0,
		bonus: data.bonus || 0,
		deductions: data.deductions || 0,
		net_salary: data.net_salary || 0,
		payment_date: data.payment_date || now(),
		payment_method: data.payment_method || 'cash',
		remarks: data.remarks || '',
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.staff_salaries.add(salary);
	return salary;
}

export async function getStaffSalaries(businessId: string, staffId?: string): Promise<StaffSalary[]> {
	let query = db.staff_salaries.where('business_id').equals(businessId);
	if (staffId) {
		return query.filter(s => !s.is_deleted && s.staff_id === staffId).sortBy('year');
	}
	return query.filter(s => !s.is_deleted).sortBy('year');
}

export async function getStaffSalaryByMonth(businessId: string, staffId: string, month: number, year: number): Promise<StaffSalary | undefined> {
	const salaries = await db.staff_salaries
		.where('business_id')
		.equals(businessId)
		.filter(s => !s.is_deleted && s.staff_id === staffId && s.month === month && s.year === year)
		.toArray();
	return salaries[0];
}

// Advance functions
export async function createStaffAdvance(businessId: string, data: Partial<StaffAdvance>): Promise<StaffAdvance> {
	const advance: StaffAdvance = {
		id: generateId(),
		business_id: businessId,
		staff_id: data.staff_id || '',
		amount: data.amount || 0,
		total_repaid: data.total_repaid || 0,
		reason: data.reason || '',
		request_date: now(),
		approval_date: '',
		approval_by: '',
		status: 'pending',
		repayment_start_month: data.repayment_start_month || 0,
		repayment_amount: data.repayment_amount || 0,
		repayment_installments: data.repayment_installments || 0,
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.staff_advances.add(advance);
	return advance;
}

export async function approveStaffAdvance(id: string, approvedBy: string, approve: boolean): Promise<void> {
	await db.staff_advances.update(id, {
		status: approve ? 'approved' : 'rejected',
		approval_date: now(),
		approval_by: approvedBy,
		last_modified: now()
	});
}

export async function getStaffAdvances(businessId: string, staffId?: string, status?: string): Promise<StaffAdvance[]> {
	let query = db.staff_advances.where('business_id').equals(businessId);
	let results = await query.filter(a => !a.is_deleted).toArray();
	if (staffId) {
		results = results.filter(a => a.staff_id === staffId);
	}
	if (status) {
		results = results.filter(a => a.status === status);
	}
	return results.sort((a, b) => b.request_date.localeCompare(a.request_date));
}

export async function repayStaffAdvance(id: string, amount: number): Promise<void> {
	const advance = await db.staff_advances.get(id);
	if (!advance) return;
	
	const newTotalRepaid = (advance.total_repaid || 0) + amount;
	const remaining = advance.amount - newTotalRepaid;
	
	if (remaining <= 0) {
		await db.staff_advances.update(id, { 
			total_repaid: advance.amount,
			status: 'repaid', 
			last_modified: now() 
		});
	} else {
		await db.staff_advances.update(id, { 
			total_repaid: newTotalRepaid,
			repayment_installments: advance.repayment_installments - 1,
			last_modified: now()
		});
	}
}

// Document functions
export async function addStaffDocument(businessId: string, data: Partial<StaffDocument>): Promise<StaffDocument> {
	const doc: StaffDocument = {
		id: generateId(),
		business_id: businessId,
		staff_id: data.staff_id || '',
		document_type: data.document_type || 'other',
		file_name: data.file_name || '',
		file_type: data.file_type || '',
		file_size: data.file_size || 0,
		base64_data: data.base64_data || '',
		is_deleted: false,
		created_at: now(),
		last_modified: now()
	};
	await db.staff_documents.add(doc);
	return doc;
}

export async function getStaffDocuments(businessId: string, staffId: string): Promise<StaffDocument[]> {
	return db.staff_documents
		.where('business_id')
		.equals(businessId)
		.filter(d => !d.is_deleted && d.staff_id === staffId)
		.toArray();
}

export async function deleteStaffDocument(id: string): Promise<void> {
	await db.staff_documents.update(id, { is_deleted: true, last_modified: now() });
}

// ─── Undo / Restore ─────────────────────────────────────────────────────────

export async function restoreRecord(tableName: string, id: string): Promise<void> {
	const table = (db as any)[tableName];
	if (!table) throw new Error(`Unknown table: ${tableName}`);
	await table.update(id, { is_deleted: false, last_modified: now() });
}
