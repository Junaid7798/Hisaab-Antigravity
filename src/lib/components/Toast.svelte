<script lang="ts">
	import { toast } from '$lib/stores/toast';
</script>

<div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
	{#each $toast as t (t.id)}
		<div
			class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg w-full transition-all duration-300 transform translate-y-0 opacity-100
			{t.type === 'success' ? 'bg-secondary-container text-on-secondary-container' : 
			 t.type === 'error' ? 'bg-error-container text-on-error-container' : 
			 'bg-surface-inverse text-inverse-on-surface'}"
			role="alert"
		>
			<span class="material-symbols-outlined text-lg">
				{t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}
			</span>
			<p class="text-sm font-semibold flex-grow">{t.message}</p>
			<button class="opacity-70 hover:opacity-100 transition-opacity" onclick={() => toast.remove(t.id)}>
				<span class="material-symbols-outlined text-sm">close</span>
			</button>
		</div>
	{/each}
</div>
