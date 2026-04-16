import { db } from './index';
import { now } from '$lib/utils/helpers';
import { supabase } from './supabase';
import { syncStatus, lastSyncError } from '$lib/stores/sync';

const SYNCABLE_TABLES = [
	'businesses',
	'patients',
	'invoices',
	'invoice_items',
	'expenses',
	'products',
	'payments',
	'suppliers',
	'purchase_order_items',
	'purchase_payments',
	'recurring_schedules',
	'purchase_orders',
	'staff',
	'staff_salaries',
	'staff_advances',
	'staff_documents',
	'attendance',
	'leave_requests',
	'leave_balances',
	'tasks',
	'loans',
	'branches',
	'bom'
];

let isSyncing = false;

async function getLastSyncAt(tableName: string): Promise<string> {
	const meta = await db.sync_meta.get(tableName);
	// Start from beginning of time if no sync record exists
	return meta?.last_sync_at || '1970-01-01T00:00:00.000Z';
}

async function setLastSyncAt(tableName: string, timestamp: string): Promise<void> {
	await db.sync_meta.put({
		id: tableName,
		table_name: tableName,
		last_sync_at: timestamp
	});
}

/**
 * Pushes local records modified AFTER natural lastSync timestamp up to Supabase.
 */
export async function pushSync() {
	for (const table of SYNCABLE_TABLES) {
		const lastSyncAt = await getLastSyncAt(table);
		
		// Find records mutated after lastSyncAt
		// Since we want records modified physically after the sync, greater than!
		const recordsToPush = await (db as any)[table]
			.where('last_modified')
			.above(lastSyncAt)
			.toArray();

		if (recordsToPush.length === 0) continue;

		console.log(`Pushing ${recordsToPush.length} records for ${table}`);

		// Upsert into Supabase
		const { error } = await supabase
			.from(table)
			.upsert(recordsToPush, { onConflict: 'id' });

		if (error) {
			console.error(`Failed to push sync ${table}:`, error);
			continue;
		}

		// Update sync meta timestamp to latest pushed record's timestamp
		const latestTimestamp = recordsToPush.reduce((max: string, r: any) => r.last_modified > max ? r.last_modified : max, lastSyncAt);
		await setLastSyncAt(table, latestTimestamp);
	}
}

/**
 * Pulls records from Supabase modified AFTER natural lastSync timestamp down to local Dexie DB.
 */
export async function pullSync() {
	for (const table of SYNCABLE_TABLES) {
		const lastSyncAt = await getLastSyncAt(table);

		// Fetch from Supabase where last_modified > lastSyncAt
		const { data, error } = await supabase
			.from(table)
			.select('*')
			.gt('last_modified', lastSyncAt);

		if (error) {
			console.error(`Failed to pull sync ${table}:`, error);
			continue;
		}

		if (!data || data.length === 0) continue;

		console.log(`Pulling ${data.length} records for ${table}`);

		// Implement true LWW at the record level
		const updates = [];
		for (const remoteRecord of data) {
			const localRecord = await (db as any)[table].get(remoteRecord.id);
			if (!localRecord || remoteRecord.last_modified > localRecord.last_modified) {
				updates.push(remoteRecord);
			}
		}

		if (updates.length > 0) {
			await (db as any)[table].bulkPut(updates);
		}

		// Update sync meta timestamp
		const latestTimestamp = data.reduce((max: string, r: any) => r.last_modified > max ? r.last_modified : max, lastSyncAt);
		await setLastSyncAt(table, latestTimestamp);
	}
}

/**
 * Triggers a bidirectional sync lock
 */
export async function runSyncEngine() {
	if (isSyncing || !navigator.onLine) return;
	
	const { data: { session } } = await supabase.auth.getSession();
	if (!session) {
		console.log('Skipping sync: No active Supabase session.');
		return;
	}

	isSyncing = true;
	syncStatus.set('syncing');
	lastSyncError.set(null);
	try {
		// Attempt full push/pull
		await pushSync();
		await pullSync();
		const currentNow = now();
		console.log(`Sync completed at ${currentNow}`);
		syncStatus.set('success');
	} catch (error: any) {
		console.error("Sync Engine Error:", error);
		lastSyncError.set(error.message || 'Unknown sync error');
		syncStatus.set('error');
	} finally {
		isSyncing = false;
		setTimeout(() => {
			syncStatus.update(s => s === 'success' ? 'idle' : s);
		}, 3000);
	}
}

/**
 * Bootstraps standard generic listeners
 */
export function initSyncEngine() {
	if (typeof window !== 'undefined') {
		window.addEventListener('online', runSyncEngine);
		
		// Run sync periodically (e.g. every 2 minutes)
		setInterval(runSyncEngine, 1000 * 60 * 2);

		// Initial sweep
		runSyncEngine();
	}
}
