import { writable } from 'svelte/store';

export const isMobileDrawerOpen = writable(false);

export function toggleMobileDrawer() {
	isMobileDrawerOpen.update((open) => !open);
}

export function closeMobileDrawer() {
	isMobileDrawerOpen.set(false);
}
