import { db } from '$lib/db';
import { formatINR, toRupees } from './currency';
import { formatDate } from './helpers';

export async function exportInvoicesToCSV(businessId: string): Promise<string> {
	const invoices = await db.invoices.where('business_id').equals(businessId).filter(i => !i.is_deleted).toArray();
	const patients = await db.patients.where('business_id').equals(businessId).toArray();
	const payments = await db.payments.where('business_id').equals(businessId).toArray();
	
	const patientMap = new Map(patients.map(p => [p.id, p.name]));
	
	const headers = ['Invoice Number', 'Customer', 'Date', 'Due Date', 'Subtotal', 'Tax', 'Grand Total', 'Paid', 'Status', 'Type'];
	const rows = invoices.map(inv => [
		inv.invoice_number,
		patientMap.get(inv.patient_id) || '',
		formatDate(inv.issue_date),
		inv.due_date ? formatDate(inv.due_date) : '',
		toRupees(inv.subtotal).toString(),
		toRupees(inv.total_tax).toString(),
		toRupees(inv.grand_total).toString(),
		inv.status === 'PAID' ? toRupees(inv.grand_total).toString() : '0',
		inv.status,
		inv.document_type || 'INVOICE'
	]);
	
	return [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
}

export async function exportExpensesToCSV(businessId: string): Promise<string> {
	const expenses = await db.expenses.where('business_id').equals(businessId).filter(e => !e.is_deleted).toArray();
	
	const headers = ['Date', 'Category', 'Description', 'Amount', 'Notes'];
	const rows = expenses.sort((a, b) => b.expense_date.localeCompare(a.expense_date)).map(exp => [
		formatDate(exp.expense_date),
		exp.category,
		exp.description,
		toRupees(exp.amount).toString(),
		exp.notes
	]);
	
	return [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
}

export async function exportPaymentsToCSV(businessId: string): Promise<string> {
	const payments = await db.payments.where('business_id').equals(businessId).filter(p => !p.is_deleted).toArray();
	const patients = await db.patients.where('business_id').equals(businessId).toArray();
	const invoices = await db.invoices.where('business_id').equals(businessId).toArray();
	
	const patientMap = new Map(patients.map(p => [p.id, p.name]));
	const invoiceMap = new Map(invoices.map(i => [i.id, i.invoice_number]));
	
	const headers = ['Date', 'Customer', 'Invoice', 'Amount', 'Method', 'Reference'];
	const rows = payments.sort((a, b) => b.payment_date.localeCompare(a.payment_date)).map(pay => [
		formatDate(pay.payment_date),
		patientMap.get(pay.patient_id) || '',
		invoiceMap.get(pay.invoice_id || '') || 'Advance',
		toRupees(pay.amount).toString(),
		pay.method,
		pay.reference
	]);
	
	return [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
}

export async function exportProductsToCSV(businessId: string): Promise<string> {
	const products = await db.products.where('business_id').equals(businessId).toArray();
	
	const headers = ['Name', 'SKU', 'HSN/SAC', 'Unit', 'Selling Price', 'Purchase Price', 'Stock', 'Tax Rate', 'Low Stock Alert'];
	const rows = products.filter(p => !p.is_deleted).map(p => [
		p.name,
		p.sku,
		p.hsn_sac,
		p.unit,
		toRupees(p.selling_price).toString(),
		toRupees(p.purchase_price).toString(),
		`${(p.stock_quantity / 100)} ${p.unit}`,
		(p.tax_rate / 100).toString() + '%',
		`${(p.low_stock_threshold / 100)} ${p.unit}`
	]);
	
	return [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
}

export async function exportCustomersToCSV(businessId: string): Promise<string> {
	const patients = await db.patients.where('business_id').equals(businessId).toArray();
	
	const headers = ['Name', 'Phone', 'Email', 'Address', 'Notes'];
	const rows = patients.filter(p => !p.is_deleted).map(p => [
		p.name,
		p.phone,
		p.email,
		p.address,
		p.notes
	]);
	
	return [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
}

export async function exportDatabaseToJSON(): Promise<string> {
	const exportData: Record<string, any[]> = {};
	
	exportData.businesses = await db.businesses.toArray();
	exportData.patients = await db.patients.toArray();
	exportData.invoices = await db.invoices.toArray();
	exportData.invoice_items = await db.invoice_items.toArray();
	exportData.expenses = await db.expenses.toArray();
	exportData.products = await db.products.toArray();
	exportData.payments = await db.payments.toArray();
	exportData.suppliers = await db.suppliers.toArray();
	exportData.purchase_orders = await db.purchase_orders.toArray();
	exportData.purchase_order_items = await db.purchase_order_items.toArray();
	exportData.purchase_payments = await db.purchase_payments.toArray();
	
	exportData.staff = await db.staff.toArray();
	exportData.staff_salaries = await db.staff_salaries.toArray();
	exportData.staff_advances = await db.staff_advances.toArray();
	exportData.staff_documents = await db.staff_documents.toArray();
	exportData.attendance = await db.attendance.toArray();
	exportData.leave_requests = await db.leave_requests.toArray();
	exportData.leave_balances = await db.leave_balances.toArray();
	exportData.tasks = await db.tasks.toArray();
	exportData.loans = await db.loans.toArray();
	exportData.branches = await db.branches.toArray();
	exportData.bom = await db.bom.toArray();
	exportData.recurring_schedules = await db.recurring_schedules.toArray();
	exportData.sync_meta = await db.sync_meta.toArray();
	
	return JSON.stringify(exportData, null, 2);
}

export function triggerDownload(content: string, filename: string, type: string = 'application/json') {
	const blob = new Blob([content], { type });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

async function clearAndImportBatch1(data: Record<string, any[]>) {
	await db.transaction('rw', db.businesses, db.patients, db.invoices, async () => {
		await db.businesses.clear();
		await db.patients.clear();
		await db.invoices.clear();
		if (data.businesses?.length > 0) await db.businesses.bulkAdd(data.businesses);
		if (data.patients?.length > 0) await db.patients.bulkAdd(data.patients);
		if (data.invoices?.length > 0) await db.invoices.bulkAdd(data.invoices);
	});
}

async function clearAndImportBatch2(data: Record<string, any[]>) {
	await db.transaction('rw', db.invoice_items, db.expenses, db.products, async () => {
		await db.invoice_items.clear();
		await db.expenses.clear();
		await db.products.clear();
		if (data.invoice_items?.length > 0) await db.invoice_items.bulkAdd(data.invoice_items);
		if (data.expenses?.length > 0) await db.expenses.bulkAdd(data.expenses);
		if (data.products?.length > 0) await db.products.bulkAdd(data.products);
	});
}

async function clearAndImportBatch3(data: Record<string, any[]>) {
	await db.transaction('rw', db.payments, db.suppliers, db.purchase_orders, db.purchase_order_items, async () => {
		await db.payments.clear();
		await db.suppliers.clear();
		await db.purchase_orders.clear();
		await db.purchase_order_items.clear();
		if (data.payments?.length > 0) await db.payments.bulkAdd(data.payments);
		if (data.suppliers?.length > 0) await db.suppliers.bulkAdd(data.suppliers);
		if (data.purchase_orders?.length > 0) await db.purchase_orders.bulkAdd(data.purchase_orders);
		if (data.purchase_order_items?.length > 0) await db.purchase_order_items.bulkAdd(data.purchase_order_items);
	});
}

async function clearAndImportBatch4(data: Record<string, any[]>) {
	await db.transaction('rw', db.purchase_payments, async () => {
		await db.purchase_payments.clear();
		if (data.purchase_payments?.length > 0) await db.purchase_payments.bulkAdd(data.purchase_payments);
	});
}

async function clearAndImportBatch5(data: Record<string, any[]>) {
	await db.transaction('rw', db.staff, db.staff_salaries, db.staff_advances, db.staff_documents, db.attendance, db.leave_requests, db.leave_balances, async () => {
		await db.staff.clear();
		await db.staff_salaries.clear();
		await db.staff_advances.clear();
		await db.staff_documents.clear();
		await db.attendance.clear();
		await db.leave_requests.clear();
		await db.leave_balances.clear();
		
		if (data.staff?.length > 0) await db.staff.bulkAdd(data.staff);
		if (data.staff_salaries?.length > 0) await db.staff_salaries.bulkAdd(data.staff_salaries);
		if (data.staff_advances?.length > 0) await db.staff_advances.bulkAdd(data.staff_advances);
		if (data.staff_documents?.length > 0) await db.staff_documents.bulkAdd(data.staff_documents);
		if (data.attendance?.length > 0) await db.attendance.bulkAdd(data.attendance);
		if (data.leave_requests?.length > 0) await db.leave_requests.bulkAdd(data.leave_requests);
		if (data.leave_balances?.length > 0) await db.leave_balances.bulkAdd(data.leave_balances);
	});
}

async function clearAndImportBatch6(data: Record<string, any[]>) {
	await db.transaction('rw', db.tasks, db.loans, db.branches, db.bom, db.recurring_schedules, db.sync_meta, async () => {
		await db.tasks.clear();
		await db.loans.clear();
		await db.branches.clear();
		await db.bom.clear();
		await db.recurring_schedules.clear();
		await db.sync_meta.clear();
		
		if (data.tasks?.length > 0) await db.tasks.bulkAdd(data.tasks);
		if (data.loans?.length > 0) await db.loans.bulkAdd(data.loans);
		if (data.branches?.length > 0) await db.branches.bulkAdd(data.branches);
		if (data.bom?.length > 0) await db.bom.bulkAdd(data.bom);
		if (data.recurring_schedules?.length > 0) await db.recurring_schedules.bulkAdd(data.recurring_schedules);
		if (data.sync_meta?.length > 0) await db.sync_meta.bulkAdd(data.sync_meta);
	});
}

export async function importDatabaseFromJSON(jsonData: string): Promise<boolean> {
	try {
		const data = JSON.parse(jsonData);
		await clearAndImportBatch1(data);
		await clearAndImportBatch2(data);
		await clearAndImportBatch3(data);
		await clearAndImportBatch4(data);
		await clearAndImportBatch5(data);
		await clearAndImportBatch6(data);
		return true;
	} catch (error) {
		console.error("Failed to import database:", error);
		return false;
	}
}

export async function wipeDatabase(): Promise<void> {
	await clearAndImportBatch1({});
	await clearAndImportBatch2({});
	await clearAndImportBatch3({});
	await clearAndImportBatch4({});
	await clearAndImportBatch5({});
	await clearAndImportBatch6({});
}
