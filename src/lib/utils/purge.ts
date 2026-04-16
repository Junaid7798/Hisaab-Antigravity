import { db } from '$lib/db/index';

const PURGE_THRESHOLD_DAYS = 30;

/**
 * Permanently removes all soft-deleted records older than PURGE_THRESHOLD_DAYS
 * from all tables in IndexedDB to free up storage.
 */
export async function purgeDeletedRecords(): Promise<{ tablesProcessed: number; recordsPurged: number }> {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - PURGE_THRESHOLD_DAYS);
	const cutoffISO = cutoff.toISOString();

	const tables = [
		db.businesses,
		db.patients,
		db.invoices,
		db.invoice_items,
		db.expenses,
		db.products,
		db.payments,
		db.suppliers,
		db.purchase_orders,
		db.purchase_order_items,
		db.purchase_payments,
		db.staff,
		db.staff_salaries,
		db.staff_advances,
		db.staff_documents,
		db.attendance,
		db.leave_requests,
		db.leave_balances,
		db.tasks,
		db.loans,
		db.branches,
		db.bom,
		db.recurring_schedules
	];

	let tablesProcessed = 0;
	let recordsPurged = 0;

	for (const table of tables) {
		try {
			const deleted = await table
				.filter((record: any) =>
					record.is_deleted === true &&
					record.last_modified &&
					record.last_modified < cutoffISO
				)
				.toArray();

			if (deleted.length > 0) {
				const ids = deleted.map((r: any) => r.id);
				await table.bulkDelete(ids);
				recordsPurged += deleted.length;
			}
			tablesProcessed++;
		} catch {
			// Skip tables that don't have is_deleted field
			tablesProcessed++;
		}
	}

	return { tablesProcessed, recordsPurged };
}
