<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { onMount, onDestroy, tick } from 'svelte';

	interface Props {
		show: boolean;
		title: string;
		onclose: () => void;
		children?: any;
	}

	let { show, title, onclose, children }: Props = $props();

	let modalEl: HTMLDivElement | undefined = $state();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && show) {
			onclose();
			return;
		}

		// Focus trap: Tab and Shift+Tab
		if (e.key === 'Tab' && show && modalEl) {
			const focusableEls = modalEl.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
			);
			if (focusableEls.length === 0) return;

			const first = focusableEls[0];
			const last = focusableEls[focusableEls.length - 1];

			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		}
	}

	// Auto-focus first element and lock body scroll when opened
	$effect(() => {
		if (show) {
			document.body.style.overflow = 'hidden';
			tick().then(() => {
				if (modalEl) {
					const first = modalEl.querySelector<HTMLElement>(
						'input:not([disabled]), textarea, select, button:not([disabled])'
					);
					first?.focus();
				}
			});
		} else {
			document.body.style.overflow = '';
		}
	});

	onMount(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('keydown', handleKeydown);
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleKeydown);
			document.body.style.overflow = '';
		}
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div 
		class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4" 
		onclick={onclose}
		in:fade={{ duration: 200 }} 
		out:fade={{ duration: 150 }}
		role="dialog"
		aria-modal="true"
		aria-label={title}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div 
			bind:this={modalEl}
			class="bg-surface-container-lowest sm:rounded-2xl rounded-t-2xl w-full max-w-lg shadow-2xl overflow-hidden pb-safe" 
			onclick={(e) => e.stopPropagation()}
			in:scale={{ duration: 300, start: 0.95, easing: cubicOut }}
			out:scale={{ duration: 200, start: 0.95 }}
		>
			<div class="px-6 py-5 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest/50">
				<h3 class="font-headline font-bold text-xl text-on-surface">{title}</h3>
				<button aria-label="Close Modal" onclick={onclose} class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors">
					<span class="material-symbols-outlined text-sm">close</span>
				</button>
			</div>
			<div class="max-h-[85vh] overflow-y-auto">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}
