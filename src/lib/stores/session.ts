import { writable } from 'svelte/store';
import { getTerminology, type Terminology } from '$lib/utils/terminology';

// We initialize from localStorage if available (wrapped in a browser check)
const initialBusinessId = typeof window !== 'undefined' ? localStorage.getItem('activeBusinessId') : null;

export const activeBusinessId = writable<string | null>(initialBusinessId);
export const activeTerminology = writable<Terminology>(getTerminology(undefined));

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
