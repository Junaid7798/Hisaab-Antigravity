<script lang="ts">
	import { toast } from '$lib/stores/toast';
	import { fly, fade } from 'svelte/transition';

	async function handleAction(t: { id: string; action?: { callback: () => void | Promise<void> } }) {
		if (t.action) {
			await t.action.callback();
			toast.remove(t.id);
		}
	}
</script>

<div class="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
	{#each $toast as t (t.id)}
		<div
			in:fly={{ y: 20, duration: 300 }}
			out:fade={{ duration: 200 }}
			class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg w-full
			{t.type === 'success' ? 'bg-secondary-container text-on-secondary-container' : 
			 t.type === 'error' ? 'bg-error-container text-on-error-container' : 
			 'bg-surface-inverse text-inverse-on-surface'}"
			role="alert"
		>
			<span class="material-symbols-outlined text-lg">
				{t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}
			</span>
			<p class="text-sm font-semibold flex-grow">{t.message}</p>
			{#if t.action}
				<button 
					class="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25 transition-colors whitespace-nowrap"
					onclick={() => handleAction(t)}
				>
					{t.action.label}
				</button>
			{/if}
			<button class="opacity-70 hover:opacity-100 transition-opacity" onclick={() => toast.remove(t.id)} aria-label="Dismiss">
				<span class="material-symbols-outlined text-sm">close</span>
			</button>
		</div>
	{/each}
</div>
