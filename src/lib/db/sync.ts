import { db } from './index';
import { now } from '$lib/utils/helpers';
import { supabase } from './supabase';
import { syncStatus, lastSyncError } from '$lib/stores/sync';
import { getPreference } from '$lib/stores/preferences';

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

async function pushSyncTable(table: string): Promise<void> {
	const lastSyncAt = await getLastSyncAt(table);

	const recordsToPush = await (db as any)[table]
		.where('last_modified')
		.above(lastSyncAt)
		.toArray();

	if (recordsToPush.length === 0) return;

	const { error } = await supabase
		.from(table)
		.upsert(recordsToPush, { onConflict: 'id' });

	if (error) {
		console.error(`Failed to push sync ${table}:`, error);
		return;
	}

	const latestTimestamp = recordsToPush.reduce(
		(max: string, r: any) => (r.last_modified > max ? r.last_modified : max),
		lastSyncAt
	);
	await setLastSyncAt(table, latestTimestamp);
}

/**
 * Pushes local records modified AFTER natural lastSync timestamp up to Supabase.
 * All tables are pushed in parallel.
 */
export async function pushSync(): Promise<void> {
	await Promise.all(SYNCABLE_TABLES.map(pushSyncTable));
}

async function pullSyncTable(table: string): Promise<void> {
	const lastSyncAt = await getLastSyncAt(table);

	const { data, error } = await supabase
		.from(table)
		.select('*')
		.gt('last_modified', lastSyncAt);

	if (error) {
		console.error(`Failed to pull sync ${table}:`, error);
		return;
	}

	if (!data || data.length === 0) return;

	// LWW: only apply remote records newer than local
	const ids: string[] = data.map((r: any) => r.id);
	const localRecords = await (db as any)[table].bulkGet(ids);
	const localMap = new Map<string, any>(
		localRecords
			.filter((r: any) => r != null)
			.map((r: any) => [r.id, r])
	);

	const updates = data.filter((remoteRecord: any) => {
		const local = localMap.get(remoteRecord.id);
		return !local || remoteRecord.last_modified > local.last_modified;
	});

	if (updates.length > 0) {
		await (db as any)[table].bulkPut(updates);
	}

	const latestTimestamp = data.reduce(
		(max: string, r: any) => (r.last_modified > max ? r.last_modified : max),
		lastSyncAt
	);
	await setLastSyncAt(table, latestTimestamp);
}

/**
 * Pulls records from Supabase modified AFTER natural lastSync timestamp down to local Dexie DB.
 * All tables are pulled in parallel. LWW conflict resolution uses bulkGet for efficiency.
 */
export async function pullSync(): Promise<void> {
	await Promise.all(SYNCABLE_TABLES.map(pullSyncTable));
}

/**
 * Triggers a bidirectional sync lock
 */
export async function runSyncEngine() {
	if (isSyncing || !navigator.onLine) return;
	if (!getPreference('cloudSyncEnabled')) return;
	
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
