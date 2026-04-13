import { db } from '$lib/db';

export async function exportDatabaseToJSON(): Promise<string> {
	const exportData: Record<string, any[]> = {};
	
	exportData.businesses = await db.businesses.toArray();
	exportData.patients = await db.patients.toArray();
	exportData.invoices = await db.invoices.toArray();
	exportData.invoice_items = await db.invoice_items.toArray();
	exportData.expenses = await db.expenses.toArray();
	
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

export async function importDatabaseFromJSON(jsonData: string): Promise<boolean> {
	try {
		const data = JSON.parse(jsonData);
		
		await db.transaction('rw', db.businesses, db.patients, db.invoices, db.invoice_items, db.expenses, async () => {
			// Clear existing records before importing
			await db.businesses.clear();
			await db.patients.clear();
			await db.invoices.clear();
			await db.invoice_items.clear();
			await db.expenses.clear();

			if (data.businesses && data.businesses.length > 0) await db.businesses.bulkAdd(data.businesses);
			if (data.patients && data.patients.length > 0) await db.patients.bulkAdd(data.patients);
			if (data.invoices && data.invoices.length > 0) await db.invoices.bulkAdd(data.invoices);
			if (data.invoice_items && data.invoice_items.length > 0) await db.invoice_items.bulkAdd(data.invoice_items);
			if (data.expenses && data.expenses.length > 0) await db.expenses.bulkAdd(data.expenses);
		});
		return true;
	} catch (error) {
		console.error("Failed to import database:", error);
		return false;
	}
}

export async function wipeDatabase(): Promise<void> {
	await db.transaction('rw', db.businesses, db.patients, db.invoices, db.invoice_items, db.expenses, async () => {
		await db.businesses.clear();
		await db.patients.clear();
		await db.invoices.clear();
		await db.invoice_items.clear();
		await db.expenses.clear();
	});
}
