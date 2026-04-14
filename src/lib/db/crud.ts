import { db, type Business, type Patient, type Invoice, type InvoiceItem, type Expense, type Product, type Payment, type Supplier, type PurchaseOrder, type PurchaseOrderItem, type PurchasePayment, type RecurringSchedule } from './index';
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
		.filter((i) => !i.is_deleted)
		.toArray();
	const payments = await db.payments
		.where('business_id')
		.equals(businessId)
		.filter((p) => !p.is_deleted)
		.toArray();
	const totalBilled = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
	const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
	return totalBilled - totalPaid;
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

// ─── Product CRUD ────────────────────────────────────────────────────────────

export async function createProduct(businessId: string, data: Partial<Product>): Promise<Product> {
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
	return product;
}

export async function getProducts(businessId: string): Promise<Product[]> {
	return db.products
		.where('business_id')
		.equals(businessId)
		.filter((p) => !p.is_deleted)
		.reverse()
		.sortBy('created_at');
}

export async function getProduct(id: string): Promise<Product | undefined> {
	const p = await db.products.get(id);
	return p && !p.is_deleted ? p : undefined;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
	await db.products.update(id, { ...data, last_modified: now() });
}

export async function softDeleteProduct(id: string): Promise<void> {
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
	return payment;
}

export async function getPayments(businessId: string): Promise<Payment[]> {
	return db.payments
		.where('business_id')
		.equals(businessId)
		.filter((p) => !p.is_deleted)
		.reverse()
		.sortBy('created_at');
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
	return db.suppliers
		.where('business_id')
		.equals(businessId)
		.filter((s) => !s.is_deleted)
		.reverse()
		.sortBy('created_at');
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
	return db.purchase_orders
		.where('business_id')
		.equals(businessId)
		.filter((po) => !po.is_deleted)
		.reverse()
		.sortBy('created_at');
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
	const todayDate = new Date().toISOString().split('T')[0];
	
	const activeSchedules = await db.recurring_schedules
		.filter(rs => !rs.is_deleted && rs.is_active && rs.next_run <= todayDate)
		.toArray();

	for (const schedule of activeSchedules) {
		const business = await db.businesses.get(schedule.business_id);
		if (!business) continue; // Should not happen, but safe

		// 1. Generate Invoice Number
		const currentYear = new Date().getFullYear();
		const nextCounter = business.invoice_counter + 1;
		const prefix = business.name.substring(0, 3).toUpperCase();
		const invoiceNumber = `${prefix}/${currentYear}/${nextCounter.toString().padStart(4, '0')}`;

		const invData = schedule.template_invoice_data;
		
		// 2. Create Invoice Transaction
		await db.transaction('rw', db.invoices, db.invoice_items, db.businesses, db.recurring_schedules, async () => {
			const invoiceId = generateId();
			await db.invoices.add({
				...invData,
				id: invoiceId,
				business_id: schedule.business_id,
				patient_id: schedule.patient_id,
				invoice_number: invoiceNumber,
				issue_date: todayDate,
				due_date: todayDate,
				status: 'PENDING',
				document_type: 'INVOICE',
				linked_invoice_id: null,
				is_deleted: false,
				created_at: now(),
				last_modified: now()
			} as unknown as Invoice);

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

			await db.businesses.update(business.id, {
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
