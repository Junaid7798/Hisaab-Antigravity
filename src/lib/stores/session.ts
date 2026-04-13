import { writable } from 'svelte/store';

// We initialize from localStorage if available (wrapped in a browser check)
const initialBusinessId = typeof window !== 'undefined' ? localStorage.getItem('activeBusinessId') : null;

export const activeBusinessId = writable<string | null>(initialBusinessId);

// Subscribe to store changes to save back to localStorage
if (typeof window !== 'undefined') {
	activeBusinessId.subscribe((id) => {
		if (id) {
			localStorage.setItem('activeBusinessId', id);
		} else {
			localStorage.removeItem('activeBusinessId');
		}
	});
}
