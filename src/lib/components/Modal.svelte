<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		show: boolean;
		title: string;
		onclose: () => void;
		children?: any;
	}

	let { show, title, onclose, children }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && show) {
			onclose();
		}
	}

	onMount(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('keydown', handleKeydown);
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleKeydown);
		}
	});
</script>

{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div 
		class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4" 
		onclick={onclose}
		in:fade={{ duration: 200 }} 
		out:fade={{ duration: 150 }}
	>
		<div 
			class="bg-surface-container-lowest sm:rounded-2xl rounded-t-2xl w-full max-w-lg shadow-2xl overflow-hidden pb-safe" 
			onclick={(e) => e.stopPropagation()}
			in:scale={{ duration: 300, start: 0.95, easing: cubicOut }}
			out:scale={{ duration: 200, start: 0.95 }}
		>
			<div class="px-6 py-5 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest/50">
				<h3 class="font-headline font-bold text-xl text-on-surface">{title}</h3>
				<button onclick={onclose} class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors">
					<span class="material-symbols-outlined text-sm">close</span>
				</button>
			</div>
			<div class="max-h-[85vh] overflow-y-auto">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}
