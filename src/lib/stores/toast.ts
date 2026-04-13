import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
}

const { subscribe, update } = writable<Toast[]>([]);

export const toast = {
	subscribe,
	show: (message: string, type: ToastType = 'success', duration = 3000) => {
		const id = Math.random().toString(36).substring(2, 9);
		update((toasts) => [...toasts, { id, message, type }]);

		setTimeout(() => {
			update((toasts) => toasts.filter((t) => t.id !== id));
		}, duration);
	},
	success: (message: string, duration?: number) => toast.show(message, 'success', duration),
	error: (message: string, duration?: number) => toast.show(message, 'error', duration),
	info: (message: string, duration?: number) => toast.show(message, 'info', duration),
	remove: (id: string) => update((toasts) => toasts.filter((t) => t.id !== id))
};
