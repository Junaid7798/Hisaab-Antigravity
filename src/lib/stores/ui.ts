import { writable } from 'svelte/store';

export const isMobileDrawerOpen = writable(false);

// Set by +layout.svelte after processRecurringSchedules() runs
export const pendingRecurringCount = writable(0);

export function toggleMobileDrawer() {
	isMobileDrawerOpen.update((open) => !open);
}

export function closeMobileDrawer() {
	isMobileDrawerOpen.set(false);
}
