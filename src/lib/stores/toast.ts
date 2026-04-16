import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	action?: { label: string; callback: () => void | Promise<void> };
}

const { subscribe, update } = writable<Toast[]>([]);

export const toast = {
	subscribe,
	show: (message: string, type: ToastType = 'success', duration = 3000, action?: Toast['action']) => {
		const id = Math.random().toString(36).substring(2, 9);
		update((toasts) => [...toasts, { id, message, type, action }]);

		setTimeout(() => {
			update((toasts) => toasts.filter((t) => t.id !== id));
		}, action ? Math.max(duration, 5000) : duration); // Give extra time when there's an action
	},
	success: (message: string, duration?: number) => toast.show(message, 'success', duration),
	error: (message: string, duration?: number) => toast.show(message, 'error', duration),
	info: (message: string, duration?: number) => toast.show(message, 'info', duration),
	undoable: (message: string, undoCallback: () => void | Promise<void>) => {
		toast.show(message, 'success', 6000, { label: 'Undo', callback: undoCallback });
	},
	remove: (id: string) => update((toasts) => toasts.filter((t) => t.id !== id))
};
