<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends /* @__PURE__ */ HTMLInputAttributes {
		label?: string;
		error?: string;
		icon?: string;
		value?: any;
	}

	let { label, error, icon, value = $bindable(), class: className = '', id, ...rest }: Props = $props();
	
	const inputId = $derived(id || `input-${Math.random().toString(36).slice(2, 9)}`);
</script>

<div class="space-y-1.5 w-full {className}">
	{#if label}
		<label for={inputId} class="text-[11px] font-label font-bold text-on-surface-variant uppercase tracking-wider block">
			{label}
		</label>
	{/if}
	<div class="relative w-full transition-all group">
		{#if icon}
			<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant/60 group-focus-within:text-primary transition-colors">
				<span class="material-symbols-outlined text-[1.1rem]">{icon}</span>
			</div>
		{/if}
		<input
			id={inputId}
			class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg {icon ? 'pl-10' : 'px-4'} pr-4 py-3 text-sm text-on-surface font-medium transition-colors placeholder:text-on-surface-variant/50 disabled:opacity-50 disabled:cursor-not-allowed {error ? 'border-error/50 focus:border-error bg-error/5 text-error placeholder:text-error/50' : ''}"
			bind:value
			{...rest}
		/>
	</div>
	{#if error}
		<p class="text-xs text-error font-medium pl-1 animate-in fade-in slide-in-from-top-1">{error}</p>
	{/if}
</div>