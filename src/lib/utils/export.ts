import { db } from '$lib/db';

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

export async function importDatabaseFromJSON(jsonData: string): Promise<boolean> {
	try {
		const data = JSON.parse(jsonData);
		await clearAndImportBatch1(data);
		await clearAndImportBatch2(data);
		await clearAndImportBatch3(data);
		await clearAndImportBatch4(data);
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
}
