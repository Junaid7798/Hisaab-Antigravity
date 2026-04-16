import { writable } from 'svelte/store';

export type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export const syncStatus = writable<SyncState>('idle');
export const lastSyncError = writable<string | null>(null);
