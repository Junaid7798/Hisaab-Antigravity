<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Props extends /* @__PURE__ */ HTMLSelectAttributes {
		label?: string;
		error?: string;
		icon?: string;
		options: { value: string | number; label: string }[];
		value?: any;
	}

	let { label, error, icon, options, value = $bindable(), class: className = '', id, ...rest }: Props = $props();
	
	const selectId = $derived(id || `select-${Math.random().toString(36).slice(2, 9)}`);
</script>

<div class="space-y-1.5 w-full {className}">
	{#if label}
		<label for={selectId} class="text-[11px] font-label font-bold text-on-surface-variant uppercase tracking-wider block">
			{label}
		</label>
	{/if}
	<div class="relative w-full transition-all group">
		{#if icon}
			<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant/60 group-focus-within:text-primary transition-colors">
				<span class="material-symbols-outlined text-[1.1rem]">{icon}</span>
			</div>
		{/if}
		<select
			id={selectId}
			class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg {icon ? 'pl-10' : 'px-4'} pr-10 py-3 text-sm text-on-surface font-medium transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed {error ? 'border-error/50 focus:border-error bg-error/5 text-error' : ''}"
			bind:value
			{...rest}
		>
			{#each options as opt}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
		<div class="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-on-surface-variant/60 group-focus-within:text-primary transition-colors">
			<span class="material-symbols-outlined text-[1.1rem]">expand_more</span>
		</div>
	</div>
	{#if error}
		<p class="text-xs text-error font-medium pl-1 animate-in fade-in slide-in-from-top-1">{error}</p>
	{/if}
</div>